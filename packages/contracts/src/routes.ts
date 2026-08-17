export const apiRoutes = {
  auth: {
    login: '/api/admin/auth/login',
    register: '/api/admin/auth/register',
    me: '/api/admin/auth/me',
  },
  chat: '/api/chat',
  sessions: {
    list: '/api/chat/sessions',
    detail: (conversationId: string) => `/api/chat/sessions/${encodeURIComponent(conversationId)}`,
    exchanges: (conversationId: string) => `/api/chat/sessions/${encodeURIComponent(conversationId)}/exchanges`,
    summary: (conversationId: string) => `/api/chat/sessions/${encodeURIComponent(conversationId)}/summary`,
    reset: (conversationId: string) => `/api/chat/sessions/${encodeURIComponent(conversationId)}/reset`,
  },
  knowledge: {
    scopes: '/api/manage/knowledge/scopes',
    scope: (scopeCode: string) => `/api/manage/knowledge/scopes/${encodeURIComponent(scopeCode)}`,
    topics: '/api/manage/knowledge/topics',
    topic: (topicCode: string) => `/api/manage/knowledge/topics/${encodeURIComponent(topicCode)}`,
  },
  documents: {
    list: '/api/manage/documents',
    detail: (documentId: number) => `/api/manage/documents/${documentId}`,
    index: (documentId: number) => `/api/manage/documents/${documentId}/index`,
    graph: (documentId: number) => `/api/manage/documents/${documentId}/graph`,
    tasks: (documentId: number) => `/api/manage/documents/${documentId}/tasks`,
  },
  health: { live: '/health/live', ready: '/health/ready' },
} as const;
