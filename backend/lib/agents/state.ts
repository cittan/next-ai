import { Annotation } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import type { Document } from '@langchain/core/documents';

/**
 * AgentState 的字段形状 —— 显式导出，供各节点和路由函数使用。
 */
export interface AgentStateShape {
  messages: BaseMessage[];
  userQuestion: string;
  llmCallCount: number;
  toolCallCount: number;
  retrievedDocuments: Document[];
  graphContext: string;
  longTermSummary: string;
  recentTranscript: string;
  executionMode: string;
  finalAnswer: string;
  finishNote: string;
  toolTraces: unknown[];
  errorMessage: string;
}

/**
 * 所有 LangGraph 智能体实现共享的中央智能体状态。
 */
export const AgentState = Annotation.Root({
  /** 累积的消息历史记录（messages reducer 自动追加） */
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),

  /** 用户原始问题 */
  userQuestion: Annotation<string>,

  /** LLM 调用次数 */
  llmCallCount: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),

  /** 工具调用执行次数 */
  toolCallCount: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),

  /** 检索到的文档（由检索工具填充） */
  retrievedDocuments: Annotation<Document[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),

  /** 来自 Neo4j 的图谱结构上下文 */
  graphContext: Annotation<string>({
    reducer: (_, update) => update,
    default: () => '',
  }),

  /** 长期记忆摘要 */
  longTermSummary: Annotation<string>,

  /** 最近对话记录 */
  recentTranscript: Annotation<string>,

  /** 执行模式 */
  executionMode: Annotation<string>,

  /** 最终答案文本 */
  finalAnswer: Annotation<string>,

  /** 展示给 UI 的完成提示 */
  finishNote: Annotation<string>,

  /** 工具调用追踪集合，用于调试 */
  toolTraces: Annotation<unknown[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),

  /** 执行失败时的错误信息 */
  errorMessage: Annotation<string>,
}) as any;
