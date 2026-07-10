
export interface ChatRequestDto {
    conversationId?: string;
    question: string;
    chatMode: string;
    selectedDocumentId?: string;
}