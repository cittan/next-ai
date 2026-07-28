/**
 * 
 * @param url 
 * @param opts
 * {method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ key: 'value' })} 
 */
const base = (url: string, opts: RequestInit) => {
    const token = localStorage.getItem('token');
    const headers: any = { ...opts.headers };
    if(token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...opts, headers }).then(r => r.ok ? r.json() : r.json().then(error => {throw new Error(error)}));
}

export const adminApi = {
    uploadDocument: (fd: FormData) => base('/api/manage/document/upload', { method: 'POST', body: fd }),
    listDocument: (p: { keyword: string, pageNo: number, pageSize: number }) => {
        const params = new URLSearchParams({
            keyword: p.keyword,
            page: p.pageNo.toString(),
            pageSize: p.pageSize.toString()
        });
        return base(`/api/manage/document/page/query?${params}`, { method: 'GET' });
    },
    deleteDocument: (id: number) => base(`/api/manage/document/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: id }) }),

    /** 获取知识范围列表 */
    listKnowledgeScopes(): Promise<Array<{ id: string; scopeCode: string; scopeName: string }>> {
        return base('/api/manage/knowledge/scope/list', { method: 'GET' });
    },

    /** 创建或更新知识范围 */
    saveKnowledgeScope(data: { scopeCode: string; scopeName: string; description?: string }): Promise<any> {
        return base('/api/manage/knowledge/scope/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    },

    /** 删除知识范围 */
    deleteKnowledgeScope(scopeCode: string): Promise<any> {
        return base('/api/manage/knowledge/scope/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scopeCode }) });
    },

    /** 获取知识主题列表 */
    listKnowledgeTopics(scopeCode?: string): Promise<Array<{ id: string; topicCode: string; topicName: string; scopeCode: string; description: string }>> {
        const url = scopeCode ? `/api/manage/knowledge/topic/list?scopeCode=${encodeURIComponent(scopeCode)}` : '/api/manage/knowledge/topic/list';
        return base(url, { method: 'GET' });
    },

    /** 创建或更新知识主题 */
    saveKnowledgeTopic(data: { topicCode: string; topicName: string; scopeCode: string; description?: string }): Promise<any> {
        return base('/api/manage/knowledge/topic/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    },

    /** 删除知识主题 */
    deleteKnowledgeTopic(topicCode: string): Promise<any> {
        return base('/api/manage/knowledge/topic/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topicCode }) });
    },

    /** 获取文档图谱数据 */
    getGraphData(documentId: number, maxDepth?: number): Promise<{
        nodes: Array<{
            id: string;
            type: string;
            data: {
                nodeId: number;
                nodeNo: number;
                nodeType: string;
                depth: number;
                title: string;
                sectionPath: string;
                contentText: string;
                itemIndex?: number;
            };
            position: { x: number; y: number };
        }>;
        edges: Array<{
            id: string;
            source: string;
            target: string;
            label?: string;
            type?: string;
        }>;
        documentId: number;
        totalNodes: number;
        totalEdges: number;
        message?: string;
    }> {
        return base('/api/manage/document/graph/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId, maxDepth }) });
    },
}