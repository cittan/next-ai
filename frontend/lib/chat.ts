import { api } from './client';

export interface ChatSession { conversationId: string; chatMode: string; status: number; title?: string | null; createdAt?: string; updatedAt?: string; exchangeCount?: number; editTime?: string; }
export interface SessionListResponse { items: ChatSession[]; page: number; pageSize: number; total: number; }
export interface ExchangeRecord { conversationId: string; exchangeId: number; question: string; answer: string; state: number; createdAt: string; }
export interface MemorySummary { conversationId: string; coveredExchangeId: number; coveredExchangeCount?: number; compressionCount: number; conversationGoal?: string; summary: string; summaryText?: string; editTime?: string; stableFacts: string[]; pendingQuestions: string[]; retrievalHints: string[]; resolvedPoints: string[]; tokenUsed: number; }

const session = (id: string) => `/api/chat/sessions/${encodeURIComponent(id)}`;

export const chatApi = {
  listSessions(params: { keyword?: string; page?: number; pageSize?: number } = {}) {
    const query = new URLSearchParams({ page: String(params.page ?? 1), pageSize: String(params.pageSize ?? 20) });
    if (params.keyword) query.set('keyword', params.keyword);
    return api.get<SessionListResponse>(`/api/chat/sessions?${query}`);
  },
  renameSession: (id: string, title: string) => api.patch(session(id), { title }),
  deleteSession: (id: string) => api.delete<void>(session(id)),
  resetSession: (id: string) => api.post<void>(`${session(id)}/reset`),
  getSessionSummary: (id: string) => api.get<MemorySummary>(`${session(id)}/summary`),
  getExchanges: (id: string, limit = 50) => api.get<{ conversationId: string; items: ExchangeRecord[] }>(`${session(id)}/exchanges?limit=${limit}`),
};
