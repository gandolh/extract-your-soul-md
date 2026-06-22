import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { STUDIES, findStudy, studyQuestions } from '../../studies.js';
import type { Question } from '../../questions.js';
import {
  answeredQuestionIds,
  getAnsweredDetailed,
  getAnswersForUser,
  getReports,
  getStudyAnswers,
  setReportInclude,
  upsertReport,
  upsertStudyAnswers,
} from '../../db/repos.js';
import type { RecordedAnswer } from '../../answers-file.js';

// Shared question → API shape. `savedBody` is the user's current answer; the
// pole/choice fields are null for question kinds that don't use them.
function serializeQuestion(q: Question, savedBody: string) {
  return {
    id: q.id,
    slug: q.slug,
    title: q.title,
    prompt: q.prompt,
    hint: q.hint ?? null,
    optional: Boolean(q.optional),
    kind: q.kind ?? 'text',
    choiceMode: q.choiceMode ?? null,
    left: q.left ?? null,
    right: q.right ?? null,
    choices: q.choices?.map((c) => ({ value: c.value, label: c.label })) ?? null,
    savedBody,
  };
}
import {
  DEFAULT_INCLUDE,
  REPORT_KEYS,
  scoreAllReports,
  type ReportKeyAll,
} from '../../scoring.js';
import { requireAuth } from '../auth.js';

// A rough completion-time estimate for a study: ~30 seconds per question,
// rounded up to whole minutes (min 1). Surfaced in the UI so the user can budget
// time before opening a form — the choice forms can run 12–20 questions now.
const SECONDS_PER_QUESTION = 30;
function estimateMinutes(questionCount: number): number {
  return Math.max(1, Math.round((questionCount * SECONDS_PER_QUESTION) / 60));
}

// Rescore every report from the user's full answer set and upsert each. Cheap
// (a handful of in-memory averages), so we just recompute all of them after any
// profile-study save rather than tracking which report changed.
function rescoreReports(userId: number): void {
  const reports = scoreAllReports(getAnswersForUser(userId));
  for (const r of reports) {
    upsertReport(userId, r.key, JSON.stringify(r), DEFAULT_INCLUDE[r.key]);
  }
}

// Bound the request so a single authenticated user can't bloat the DB with a
// multi-MB answer body or a flood of answer rows. 50k chars is far past any
// genuine study answer; a study has well under 100 questions.
const SaveBody = z.object({
  answers: z
    .array(z.object({ id: z.string().max(64), body: z.string().max(50_000) }))
    .max(100),
});

export async function studyRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  // Study list with per-user progress.
  app.get('/api/studies', async (request) => {
    const answered = answeredQuestionIds(request.userId!);
    return {
      studies: STUDIES.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        band: s.band ?? 'voice',
        reportKey: s.reportKey ?? null,
        total: s.questionIds.length,
        completed: s.questionIds.filter((qid) => answered.has(qid)).length,
        // Rough "how long will this take" estimate at ~30s/question, so the
        // user can budget time before opening a form (longer forms now exist).
        estimateMinutes: estimateMinutes(s.questionIds.length),
      })),
    };
  });

  // One study, with its questions pre-filled from saved answers.
  app.get<{ Params: { studyId: string } }>('/api/studies/:studyId', async (request, reply) => {
    const study = findStudy(request.params.studyId);
    if (!study) return reply.code(404).send({ error: 'Unknown study.' });
    const saved = getStudyAnswers(request.userId!, study.id);
    return {
      study: {
        id: study.id,
        title: study.title,
        description: study.description,
        band: study.band ?? 'voice',
        reportKey: study.reportKey ?? null,
        estimateMinutes: estimateMinutes(study.questionIds.length),
      },
      questions: studyQuestions(study).map((q) => serializeQuestion(q, saved.get(q.id)?.body ?? '')),
    };
  });

  // Every answer the user has made, grouped by study, with last-edited times —
  // powers the "all your answers" review/edit page (revisit answers over time).
  // Only studies with at least one non-empty answer are returned; within each,
  // only the answered questions (so it's "answers you made", not the full form).
  app.get('/api/answers', async (request) => {
    const answered = getAnsweredDetailed(request.userId!);
    const byQuestion = new Map(answered.map((a) => [a.question_id, a]));
    const studies = STUDIES.map((study) => {
      const all = studyQuestions(study);
      const questions = all
        .filter((q) => byQuestion.has(q.id))
        .map((q) => {
          const row = byQuestion.get(q.id)!;
          return { ...serializeQuestion(q, row.body), updatedAt: row.updated_at };
        });
      return {
        id: study.id,
        title: study.title,
        band: study.band ?? 'voice',
        answeredCount: questions.length,
        totalCount: all.length,
        questions,
      };
    }).filter((s) => s.answeredCount > 0);
    return { studies };
  });

  // Save answers for a single study (only its own question ids are accepted).
  app.post<{ Params: { studyId: string } }>(
    '/api/studies/:studyId/answers',
    async (request, reply) => {
      const study = findStudy(request.params.studyId);
      if (!study) return reply.code(404).send({ error: 'Unknown study.' });
      const parsed = SaveBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Expected { answers: [{ id, body }] }.' });
      }
      const questions = studyQuestions(study);
      const byId = new Map(questions.map((q) => [q.id, q]));
      const bodyById = new Map(parsed.data.answers.map((a) => [a.id, a.body]));

      // Build one RecordedAnswer per question in the study — absent fields
      // become empty (skipped), so resaving a partially-filled form is lossless.
      const answers: RecordedAnswer[] = questions.map((q) => ({
        id: q.id,
        title: q.title,
        body: (bodyById.get(q.id) ?? '').trim(),
      }));
      void byId; // questions are the authority for which ids we persist

      upsertStudyAnswers(request.userId!, study.id, answers);
      // Profile studies feed a scored report — recompute it on save so the UI
      // and extraction see fresh numbers. Voice studies have no report.
      if ((study.band ?? 'voice') === 'profile') rescoreReports(request.userId!);
      const answered = answers.filter((a) => a.body.length > 0).length;
      return reply.send({ ok: true, answered, total: questions.length });
    },
  );

  // All scored reports for the user, parsed payloads + include flag.
  app.get('/api/reports', async (request) => {
    const stored = new Map(getReports(request.userId!).map((r) => [r.report_key, r]));
    return {
      reports: REPORT_KEYS.map((key) => {
        const row = stored.get(key);
        return {
          key,
          // payload is already a ReportPayload JSON; pass through verbatim.
          payload: row ? JSON.parse(row.payload) : null,
          includeInSoul: row
            ? row.include_in_soul === 1
            : DEFAULT_INCLUDE[key as ReportKeyAll],
        };
      }),
    };
  });

  // Toggle whether a report is folded into soul.md.
  const ToggleBody = z.object({ includeInSoul: z.boolean() });
  app.post<{ Params: { reportKey: string } }>(
    '/api/reports/:reportKey/include',
    async (request, reply) => {
      const key = request.params.reportKey;
      if (!REPORT_KEYS.includes(key as ReportKeyAll)) {
        return reply.code(404).send({ error: 'Unknown report.' });
      }
      const parsed = ToggleBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Expected { includeInSoul: boolean }.' });
      }
      // Ensure a row exists (a user may toggle before the report was scored).
      const stored = new Map(getReports(request.userId!).map((r) => [r.report_key, r]));
      if (!stored.has(key)) rescoreReports(request.userId!);
      setReportInclude(request.userId!, key, parsed.data.includeInSoul);
      return reply.send({ ok: true });
    },
  );
}
