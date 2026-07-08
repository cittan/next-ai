import { api } from "./client";

export interface ChatSession {
    conversationId: string;
    chatMode: string;
    status: number;
    title: string;
    selectedDocumentId?: string;
    selectedDocumentName?: string;
    createTime: string;
    editTime: string;
    exchangeCount: number;
}

export interface MemorySummary {
    conversationId: string;
    coveredExchangeId: number;
    coveredExchangeCount: number;
    compressionCount: number;
    summaryText: string;
    editTime: string;
}

export interface SessionListResponse {
    pageNo: number;
    pageSize: number;
    totalSize: number;
    totalPages: number;
    sessions: ChatSession[];
}


export const chatApi = {
    async listSessions(params?: {
        keyword?: string;
        chatMode?: string;
        pageNo?: number;
        pageSize?: number;
    }): Promise<SessionListResponse> {
        const searchParams = new URLSearchParams();
        if (params?.keyword) {
            searchParams.append('keyword', params.keyword);
        }
        if (params?.chatMode) {
            searchParams.append('chatMode', params.chatMode);
        }
        if (params?.pageNo) {
            searchParams.append('pageNo', params.pageNo.toString());
        }
        if (params?.pageSize) {
            searchParams.append('pageSize', params.pageSize.toString());
        }
        const query = searchParams.toString();
        return api.get<SessionListResponse>(`/api/chat/session/list?${query ? `${query}` : ''}`);
    },
    async renameSession(conversationId: string, title: string): Promise<any> {
        return api.post(`/api/chat/session/rename?conversationId=${conversationId}&title=${encodeURIComponent(title)}`);
    },
    async deleteSession(conversationId: string): Promise<any> {
        return api.post(`/api/chat/session/delete?conversationId=${conversationId}`);
    },
    async resetSession(conversationId: string): Promise<any> {
        return api.post(`/api/chat/session/reset?conversationId=${conversationId}`);
    },
    //下方暂时为测试用,后续需要根据需求调整
    async getSessionSummary(conversationId: string): Promise<MemorySummary> {
        return api.get<MemorySummary>(`/api/chat/session/summary?conversationId=${conversationId}`);
    }

}

