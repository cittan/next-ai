import { ExecutionMode } from '../models/enum';
import { createReactGraph } from './graphs/reactAgentGraph';

// Agent工厂函数：根据执行模式创建对应的Agent实例
export function createAgent(mode: ExecutionMode) {
  if (mode === ExecutionMode.REACT_AGENT) return createReactGraph();
  // 未来可扩展更多Agent模式，如RAG_CHAT等
  throw new Error(`Unsupported mode: ${mode}`);
}
