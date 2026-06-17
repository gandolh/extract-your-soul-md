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
  type Conversation,
  type ConversationDetail,
  type ConversationProvider,
  type DetectedSender,
  type ReportKey,
  type ReportState,
  type ResultsState,
  type StudyDetail,
  type StudySummary,
} from './client';

export const queryKeys = {
  me: ['me'] as const,
  studies: ['studies'] as const,
  study: (id: string) => ['study', id] as const,
  reports: ['reports'] as const,
  conversations: ['conversations'] as const,
  conversation: (id: number) => ['conversation', id] as const,
  senders: ['senders'] as const,
  names: ['names'] as const,
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

export function useReports(enabled = true) {
  return useQuery({
    queryKey: queryKeys.reports,
    queryFn: () => api.reports().then((r) => r.reports),
    enabled,
  });
}

export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations,
    queryFn: () => api.conversations().then((r) => r.conversations),
  });
}

export function useConversation(id: number) {
  return useQuery({
    queryKey: queryKeys.conversation(id),
    queryFn: () => api.conversation(id).then((r) => r.conversation),
    enabled: Number.isInteger(id) && id > 0,
    retry: false, // a 404 is a real "unknown conversation", not transient
  });
}

export function useSenders() {
  return useQuery({
    queryKey: queryKeys.senders,
    queryFn: () => api.senders().then((r) => r.senders),
  });
}

export function useNames() {
  return useQuery({
    queryKey: queryKeys.names,
    queryFn: () => api.names().then((r) => r.names),
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

export function useAddConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { filename: string; content: string; provider?: ConversationProvider }) =>
      api.addConversation(vars.filename, vars.content, vars.provider),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.conversations });
      void qc.invalidateQueries({ queryKey: queryKeys.senders });
    },
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteConversation(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.conversations });
      void qc.invalidateQueries({ queryKey: queryKeys.senders });
    },
  });
}

export function useSetConversationNames(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (names: string[] | null) => api.setConversationNames(id, names),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.conversation(id) });
      void qc.invalidateQueries({ queryKey: queryKeys.conversations });
      void qc.invalidateQueries({ queryKey: queryKeys.senders });
    },
  });
}

export function useSetNames() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (names: string[]) => api.setNames(names),
    onSuccess: (r) => {
      qc.setQueryData(queryKeys.names, r.names);
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
  Conversation,
  ConversationDetail,
  ConversationProvider,
  DetectedSender,
  ReportState,
  ResultsState,
  StudySummary,
};
