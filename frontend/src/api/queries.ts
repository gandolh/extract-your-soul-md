// React Query hooks over the `api` client. Query keys are centralized here so
// mutations can invalidate precisely. GETs become queries; POST/PUT/DELETE
// become mutations that invalidate the affected queries on success.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  api,
  type AnswersStudy,
  type AnsweredQuestion,
  type ConversationStats,
  type ReportKey,
  type ReportState,
  type ResultsState,
  type SavedStatDetail,
  type SavedStatSummary,
  type StudyDetail,
  type StudySummary,
  type SwipeCard,
  type SwipeState,
  type SwipeVerdict,
} from './client';

export const queryKeys = {
  me: ['me'] as const,
  studies: ['studies'] as const,
  study: (id: string) => ['study', id] as const,
  answers: ['answers'] as const,
  reports: ['reports'] as const,
  swipe: ['swipe'] as const,
  savedStats: ['saved-stats'] as const,
  savedStat: (id: number) => ['saved-stat', id] as const,
  results: ['results'] as const,
};

// ---- Queries --------------------------------------------------------------

export function useStudies() {
  return useQuery({
    queryKey: queryKeys.studies,
    queryFn: () => api.studies().then((r) => r.studies),
  });
}

export function useStudy(id: string, options?: Partial<UseQueryOptions<StudyDetail>>) {
  return useQuery({
    queryKey: queryKeys.study(id),
    queryFn: () => api.study(id),
    enabled: id.length > 0,
    retry: false, // a 404 is a real "unknown study", not a transient failure
    ...options,
  });
}

export function useAnswers() {
  return useQuery({
    queryKey: queryKeys.answers,
    queryFn: () => api.answers().then((r) => r.studies),
  });
}

export function useReports(enabled = true) {
  return useQuery({
    queryKey: queryKeys.reports,
    queryFn: () => api.reports().then((r) => r.reports),
    enabled,
  });
}

export function useSwipe() {
  return useQuery({
    queryKey: queryKeys.swipe,
    queryFn: () => api.swipe(),
  });
}

export function useSavedStats() {
  return useQuery({
    queryKey: queryKeys.savedStats,
    queryFn: () => api.savedStats().then((r) => r.saved),
  });
}

export function useSavedStat(id: number) {
  return useQuery({
    queryKey: queryKeys.savedStat(id),
    queryFn: () => api.savedStat(id),
    enabled: Number.isInteger(id) && id > 0,
    retry: false, // a 404 is a real "no such saved result"
  });
}

// Poll while a job is live; the caller flips `polling` based on the server's
// active-job flag, so a reload mid-run resumes the poll loop.
export function useResults(polling: boolean, pollMs: number) {
  return useQuery({
    queryKey: queryKeys.results,
    queryFn: () => api.results(),
    refetchInterval: polling ? pollMs : false,
  });
}

// ---- Mutations ------------------------------------------------------------

export function useSaveStudy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; answers: Array<{ id: string; body: string }> }) =>
      api.saveStudy(vars.id, vars.answers),
    // Note: we deliberately do NOT invalidate the open study's own detail — the
    // editor's local `answers` state is authoritative while editing, and a
    // refetch would re-seed (and reset the autosave baseline) underneath the
    // user. The studies index (progress) and reports (scores) do refresh.
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.studies });
      void qc.invalidateQueries({ queryKey: queryKeys.reports });
      void qc.invalidateQueries({ queryKey: queryKeys.answers });
    },
  });
}

export function useSetReportInclude() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { key: ReportKey; includeInSoul: boolean }) =>
      api.setReportInclude(vars.key, vars.includeInSoul),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.reports });
    },
  });
}

// Generate a fresh batch of cards (one slow Ollama call). On success we seed the
// swipe query with the returned deck so the page shows new cards immediately.
export function useGenerateCards() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.generateCards(),
    onSuccess: (r) => {
      qc.setQueryData<SwipeState>(queryKeys.swipe, (prev) =>
        prev ? { ...prev, cards: r.cards } : prev,
      );
    },
  });
}

// Record a swipe. We optimistically patch the cached deck so the card advances
// instantly, then reconcile from the server on settle.
export function useSetVerdict() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; verdict: SwipeVerdict | null }) =>
      api.setVerdict(vars.id, vars.verdict),
    onMutate: (vars) => {
      qc.setQueryData<SwipeState>(queryKeys.swipe, (prev) =>
        prev
          ? {
              ...prev,
              cards: prev.cards.map((c: SwipeCard) =>
                c.id === vars.id ? { ...c, verdict: vars.verdict } : c,
              ),
            }
          : prev,
      );
    },
  });
}

// Analyze a conversation on the spot. Transient: nothing is cached or stored —
// the page holds the returned stats in local state until the user saves.
export function useComputeStats() {
  return useMutation({
    mutationFn: (conversation: string) => api.computeStats(conversation).then((r) => r.stats),
  });
}

export function useSaveStats() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { stats: ConversationStats; name?: string }) =>
      api.saveStats(vars.stats, vars.name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.savedStats });
    },
  });
}

export function useDeleteSavedStat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteSavedStat(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.savedStats });
    },
  });
}

export function useExtract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.extract(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.results });
    },
  });
}

// Re-export the row types most consumers want alongside their hook.
export type {
  AnswersStudy,
  AnsweredQuestion,
  ConversationStats,
  ReportState,
  ResultsState,
  SavedStatDetail,
  SavedStatSummary,
  StudySummary,
  SwipeCard,
  SwipeState,
  SwipeVerdict,
};
