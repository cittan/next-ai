import { api } from './client';

const documents = '/api/manage/documents';
const scopes = '/api/manage/knowledge/scopes';
const topics = '/api/manage/knowledge/topics';

export const adminApi = {
  uploadDocument: (data: FormData) => api.post<any>(documents, data),
  listDocument: (p: { keyword: string; pageNo: number; pageSize: number }) => {
    const query = new URLSearchParams({ keyword: p.keyword, page: String(p.pageNo), pageSize: String(p.pageSize) });
    return api.get<any>(`${documents}?${query}`);
  },
  deleteDocument: (id: number) => api.delete<void>(`${documents}/${id}`),
  buildDocumentIndex: (id: number, planId?: number) => api.post<any>(`${documents}/${id}/index`, planId ? { planId } : {}),

  listKnowledgeScopes: async () => (await api.get<{ items: any[] }>(scopes)).items,
  saveKnowledgeScope: (data: any) => data.isNew === false
    ? api.patch(`${scopes}/${encodeURIComponent(data.scopeCode)}`, data)
    : api.post(scopes, data),
  deleteKnowledgeScope: (code: string) => api.delete<void>(`${scopes}/${encodeURIComponent(code)}`),

  listKnowledgeTopics: async (scopeCode?: string) => {
    const query = scopeCode ? `?scopeCode=${encodeURIComponent(scopeCode)}` : '';
    return (await api.get<{ items: any[] }>(`${topics}${query}`)).items;
  },
  saveKnowledgeTopic: (data: any) => data.isNew === false
    ? api.patch(`${topics}/${encodeURIComponent(data.topicCode)}`, data)
    : api.post(topics, data),
  deleteKnowledgeTopic: (code: string) => api.delete<void>(`${topics}/${encodeURIComponent(code)}`),
};
