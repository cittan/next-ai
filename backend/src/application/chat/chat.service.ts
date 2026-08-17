import type { ChatRequest } from '@next-ai/contracts';
import { ChatQueryMode, ExchangeState, ExecutionMode } from '../../../lib/models/enum';
import { conversationManager } from '../../../lib/service/chat/ConversationManager';
import { prepareExecutionPlan } from '../../../lib/service/chat/preparationOrchestrator';
import { streamChatCompletion, type ChatMessage } from '../../../lib/ai/client';
import { retrieve } from '../../../lib/rag/channels/retirevalEngine';
import { buildRagPrompt } from '../../../lib/rag/channels/promptAssembler';

export interface ChatCallbacks {
  session(conversationId: string, exchangeId: number): void;
  token(content: string): void;
}

export async function runChat(input: ChatRequest, callbacks: ChatCallbacks, signal?: AbortSignal) {
  const conversationId = input.conversationId ?? crypto.randomUUID();
  const mode = input.chatMode as ChatQueryMode;
  let session = await conversationManager.getSession(conversationId);
  if (!session) await conversationManager.createSession({ conversationId, chatMode: mode });
  const exchangeId = (await conversationManager.getLatestExchangeId(conversationId)) + 1;
  await conversationManager.createExchange({ conversationId, exchangeId, question: input.question });
  await conversationManager.setSessionActive({ conversationId });
  callbacks.session(conversationId, exchangeId);

  const startedAt = Date.now();
  let firstTokenAt: number | undefined;
  let answer = '';

  try {
    const plan = await prepareExecutionPlan({ conversationId, question: input.question, chatMode: mode, selectedDocumentId: input.selectedDocumentId?.toString() });
    if (plan.mode === ExecutionMode.REACT_AGENT) {
      const { createAgent } = await import('../../../lib/agents/agent-factory');
      const stream = await createAgent(ExecutionMode.REACT_AGENT).stream(
        { userQuestion: plan.rewrittenQuestion, longTermSummary: plan.longTermSummary, recentTranscript: plan.recentTranscript },
        { streamMode: ['updates', 'messages'] },
      );
      for await (const [streamMode, update] of stream) {
        if (signal?.aborted) break;
        if (streamMode !== 'messages') continue;
        const message = Array.isArray(update) ? update[0] : update;
        const content = typeof message?.content === 'string' ? message.content : '';
        if (content) {
          firstTokenAt ??= Date.now();
          answer += content;
          callbacks.token(content);
        }
      }
    } else {
      const rag = await retrieve(plan.rewrittenQuestion);
      const messages: ChatMessage[] = [
        { role: 'system', content: `你是Super Agent智能助手。${plan.longTermSummary ? `\n对话历史摘要: ${plan.longTermSummary}` : ''}` },
        { role: 'user', content: rag.results.length ? buildRagPrompt(input.question, rag.evidenceText) : input.question },
      ];
      for await (const chunk of streamChatCompletion(messages, { maxTokens: 256, temperature: 0.3 })) {
        if (signal?.aborted) break;
        if (!chunk.content) continue;
        firstTokenAt ??= Date.now();
        answer += chunk.content;
        callbacks.token(chunk.content);
      }
    }

    await conversationManager.completeExchange({ conversationId, exchangeId, answer, exchangeState: signal?.aborted ? ExchangeState.FAILED : ExchangeState.COMPLETED, firstTokenLatencyMs: firstTokenAt ? firstTokenAt - startedAt : undefined, totalLatencyMs: Date.now() - startedAt });
    if (exchangeId === 1 && !signal?.aborted) await conversationManager.renameSession({ conversationId, title: input.question.slice(0, 50) });
    return { conversationId, exchangeId, totalLatencyMs: Date.now() - startedAt };
  } catch (error) {
    await conversationManager.completeExchange({ conversationId, exchangeId, answer, exchangeState: ExchangeState.FAILED, totalLatencyMs: Date.now() - startedAt }).catch(() => undefined);
    throw error;
  } finally {
    await conversationManager.setSessionIdle({ conversationId }).catch(() => undefined);
  }
}
