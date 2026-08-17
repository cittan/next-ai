import { AIMessage, HumanMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { config } from '../config';

export interface ChatMessage {
  role: 'system' | 'assistant' | 'user';
  content: string;
}

type ModelOptions = { model?: string; temperature?: number; maxTokens?: number };

function model(options: ModelOptions = {}) {
  return new ChatOpenAI({
    model: options.model || config.ai.chatModel,
    temperature: options.temperature ?? config.ai.temperature,
    maxTokens: options.maxTokens ?? config.ai.maxTokens,
    maxRetries: 3,
    timeout: 60_000,
    configuration: { baseURL: config.ai.baseUrl, apiKey: config.ai.apiKey },
  });
}

function messages(input: ChatMessage[]): BaseMessage[] {
  return input.map((message) => {
    if (message.role === 'system') return new SystemMessage(message.content);
    if (message.role === 'assistant') return new AIMessage(message.content);
    return new HumanMessage(message.content);
  });
}

function text(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((part: any) => typeof part === 'string' ? part : part?.type === 'text' ? part.text : '').join('');
}

export async function chatCompletion(input: ChatMessage[], options: ModelOptions = {}) {
  const response = await model(options).invoke(messages(input));
  const usage = response.usage_metadata;
  return {
    content: text(response.content),
    usage: {
      promptTokens: usage?.input_tokens || 0,
      completionTokens: usage?.output_tokens || 0,
      totalTokens: usage?.total_tokens || 0,
    },
  };
}

export async function* streamChatCompletion(input: ChatMessage[], options: ModelOptions = {}): AsyncGenerator<{ content: string; finishReason: string | null }> {
  const stream = await model(options).stream(messages(input));
  for await (const chunk of stream) {
    yield { content: text(chunk.content), finishReason: chunk.response_metadata?.finish_reason as string || null };
  }
}

let embeddings: OpenAIEmbeddings | undefined;
function embeddingModel() {
  embeddings ??= new OpenAIEmbeddings({
    model: config.ai.embeddingModel,
    maxRetries: 3,
    timeout: 60_000,
    configuration: { baseURL: config.ai.baseUrl, apiKey: config.ai.apiKey },
  });
  return embeddings;
}

export function createEmbedding(input: string): Promise<number[]> {
  return embeddingModel().embedQuery(input);
}

export function createEmbeddings(input: string[]): Promise<number[][]> {
  return embeddingModel().embedDocuments(input);
}

export function estimateTokens(value: string): number {
  const chinese = (value.match(/[一-鿿]/g) || []).length;
  return Math.ceil(chinese * 1.3 + (value.length - chinese) * 0.25);
}
