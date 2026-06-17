import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { STUDIES, findStudy, studyQuestions } from '../../studies.js';
import {
  answeredQuestionIds,
  getStudyAnswers,
  upsertStudyAnswers,
} from '../../db/repos.js';
import type { RecordedAnswer } from '../../answers-file.js';
import { requireAuth } from '../auth.js';

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
        total: s.questionIds.length,
        completed: s.questionIds.filter((qid) => answered.has(qid)).length,
      })),
    };
  });

  // One study, with its questions pre-filled from saved answers.
  app.get<{ Params: { studyId: string } }>('/api/studies/:studyId', async (request, reply) => {
    const study = findStudy(request.params.studyId);
    if (!study) return reply.code(404).send({ error: 'Unknown study.' });
    const saved = getStudyAnswers(request.userId!, study.id);
    return {
      study: { id: study.id, title: study.title, description: study.description },
      questions: studyQuestions(study).map((q) => ({
        id: q.id,
        slug: q.slug,
        title: q.title,
        promptEn: q.promptEn,
        promptRo: q.promptRo,
        hintEn: q.hintEn ?? null,
        hintRo: q.hintRo ?? null,
        optional: Boolean(q.optional),
        savedBody: saved.get(q.id)?.body ?? '',
      })),
    };
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
      const answered = answers.filter((a) => a.body.length > 0).length;
      return reply.send({ ok: true, answered, total: questions.length });
    },
  );
}
