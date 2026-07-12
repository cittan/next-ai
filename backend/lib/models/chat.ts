import { ChatQueryMode, ExecutionMode } from "./enum";

export interface ChatRequestDto {
    conversationId?: string;
    question: string;
    chatMode: string;
    selectedDocumentId?: string;
}

export interface ConversationExecutionPlan {
    chatMode: ChatQueryMode;
    originalQuestion: string;
    agentQuestion: string;
    rewriteQuestion: string;
    rewriteSubQuestions: string[];
    retrievalQuestion: string;
    retrievalSubQuestions: string[];
    mode: ExecutionMode;
    selectedDocumentId?: number;
    selectedDocumentName: string;
    retrievalDocumentIds: number[];
    historySummary: string;
    longTermSummary: string;
    recentHistoryTranscript: string;
    answerRecentTranscript: string;
    historyCompressionApplied: boolean;
    currentDate: string;
    noEvidenceReply: string;
}