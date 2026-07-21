import { DocumentNavigationAction, ExecutionMode } from "@/lib/models/enum";


export const routerService = {
    async routeQuestion(p: { question: string; documentName?: string; documentId?: number }) {
        if(p.documentId || p.documentName) {
            return {
                executionMode: ExecutionMode.RAG_CHAT,
                navigationAction: DocumentNavigationAction.FRESH_TOPIC,
                confidence: 0.8
            };
        }
        return { 
            executionMode: ExecutionMode.REACT_AGENT, 
            navigationAction: DocumentNavigationAction.FRESH_TOPIC, 
            confidence: 0.7 
        };
    }
}