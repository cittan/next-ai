# Express 后端迁移与 LangChain 统一设计

日期：2026-08-17

## 1. 目标与范围

本改造分为两个串行阶段，禁止混合实施。

### 第一阶段：Express 迁移并打通前后端

- 保留 `frontend` 为 Next.js 前端应用。
- 将 `backend` 从 Next.js Route Handler 运行时迁移为 Express API。
- 将 Kafka 文档消费者从 Web 服务生命周期中拆为独立 Worker。
- 保留现有 RAG、LangGraph、Prisma、Redis、MinIO、Elasticsearch、pgvector、Kafka 和 OpenAI-compatible 模型逻辑。
- 建立前后端共享 API/SSE 契约。
- 重写前端 API Client、SSE 解析和相关页面，消除所有不存在后端实现的“虚空请求”。
- 以主要页面通过真实 API 完成核心流程作为验收边界。

### 第二阶段：模型访问层统一到 LangChain

第一阶段验证完成并形成检查点总结后再开始：

- 普通聊天迁移到 `ChatOpenAI`。
- Embedding 迁移到 `OpenAIEmbeddings`。
- 查询改写与记忆摘要迁移到 LangChain structured output + Zod。
- 保留 LangGraph 负责 ReAct Agent 的状态与工具编排。
- 删除生产代码对原生 `openai` SDK 的直接依赖。

### 不在本次范围

- 更换 Qwen/OpenAI-compatible 模型供应商。
- 将确定性业务逻辑改造成 LangGraph。
- 全面领域驱动设计重构。
- Outbox、死信队列、多 Agent 等新增能力。
- 重写 Prisma schema 或迁移现有业务数据。

## 2. 交付与 Git 策略

实施分支为：

```text
feat/express-backend-migration
```

每个可独立验证的模块遵循：

```text
实现 → 单元/集成测试 → 类型检查 → 构建 → 检查 diff → commit → push
```

约束：

- 不直接推送 `main`。
- 验证失败的模块不提交为完成状态。
- 每个模块独立 commit，确保可回滚。
- 每个 commit 完成后立即推送到远端功能分支。
- 不将已有未跟踪文件 `backend/lib/rag/channels/面试复习清单.md` 纳入提交，除非用户另行明确要求。

建议提交边界：

1. Express 基础设施与共享契约。
2. Auth API 与鉴权中间件。
3. Session API。
4. Knowledge API。
5. Document API。
6. Chat 编排与 SSE。
7. Kafka Worker 独立化。
8. 前端 API Client 与契约对齐。
9. Chat 页面状态与 SSE Parser。
10. 管理页面与虚空请求清理。
11. 全量集成测试与旧 Next.js 后端清理。

## 3. 目标运行架构

最终保留三个独立运行单元及一个共享包：

```text
frontend/             Next.js 页面、客户端状态、API Client、SSE Parser
backend/src/server.ts Express REST + SSE API
backend/src/workers/  Kafka 文档处理 Worker
packages/contracts/   DTO、Zod Schema、路由构造函数、SSE 事件
```

数据流：

```text
Browser
  → Next.js Frontend
  → Express API
      ├─ PostgreSQL / Prisma
      ├─ Redis
      ├─ MinIO
      ├─ Elasticsearch
      ├─ pgvector
      ├─ OpenAI-compatible Qwen
      └─ Kafka Producer
           → Document Worker
               ├─ ParserProcessor
               ├─ StrategyService
               ├─ Embedding
               └─ PGVector + Elasticsearch Indexing
```

### 3.1 Next.js 前端边界

前端只负责：

- 页面与表单。
- 客户端状态。
- 集中的 API Client。
- SSE frame 解析与流式 UI。
- 取消、重试和错误展示。

前端不保留业务 Route Handler。可使用 Next.js rewrite 将 `/api/*` 代理到 Express，但不再新增一层包含业务逻辑的 Next.js API 转发器。

### 3.2 Express API 边界

Express 负责：

- Auth、Session、Knowledge、Document、Chat API。
- JWT 鉴权、Schema 校验和统一错误响应。
- 聊天应用编排、RAG 与 LangGraph 调用。
- Kafka 消息生产。
- HTTP/SSE 生命周期与 graceful shutdown。

### 3.3 Worker 边界

Worker 只负责：

- Kafka 消费。
- 文档解析与结构提取。
- 策略推荐。
- Embedding 和双索引构建。
- 任务状态、重试与幂等。

API 实例不得隐式启动 Consumer。

## 4. 代码分层

第一阶段避免无关的大规模目录重排。新增清晰入口和应用层，保留现有 `backend/lib` 业务模块：

```text
backend/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── http/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   └── errors/
│   ├── application/
│   │   ├── auth/
│   │   ├── chat/
│   │   ├── sessions/
│   │   ├── documents/
│   │   └── knowledge/
│   └── workers/
│       └── document.worker.ts
├── lib/
└── prisma/
```

依赖方向：

```text
Controller → Application Service → lib Service → Infrastructure
```

禁止：

- `lib` 导入 Express。
- Application Service 操作 `Response` 或 `res.write()`。
- Worker 导入 Express App。
- Controller 直接编排 Prisma 事务、RAG 或 LangGraph 循环。

## 5. API 契约

### 5.1 Auth

```text
POST /api/admin/auth/login
POST /api/admin/auth/register
GET  /api/admin/auth/me
```

### 5.2 Chat 与 Session

```text
POST   /api/chat
GET    /api/chat/sessions
GET    /api/chat/sessions/:conversationId/exchanges
GET    /api/chat/sessions/:conversationId/summary
PATCH  /api/chat/sessions/:conversationId
POST   /api/chat/sessions/:conversationId/reset
DELETE /api/chat/sessions/:conversationId
```

分页统一为：

```text
page
pageSize
keyword
chatMode
```

### 5.3 Knowledge

```text
GET    /api/manage/knowledge/scopes
POST   /api/manage/knowledge/scopes
PATCH  /api/manage/knowledge/scopes/:scopeCode
DELETE /api/manage/knowledge/scopes/:scopeCode

GET    /api/manage/knowledge/topics
POST   /api/manage/knowledge/topics
PATCH  /api/manage/knowledge/topics/:topicCode
DELETE /api/manage/knowledge/topics/:topicCode
```

### 5.4 Document

```text
GET    /api/manage/documents
POST   /api/manage/documents
GET    /api/manage/documents/:documentId
DELETE /api/manage/documents/:documentId
POST   /api/manage/documents/:documentId/index
GET    /api/manage/documents/:documentId/graph
GET    /api/manage/documents/:documentId/tasks
```

上传成功仅表示任务已接受，响应使用 `202 Accepted` 并返回 `documentId` 与 `taskId`。

## 6. 共享契约

`packages/contracts` 至少包含：

```text
routes.ts
common.ts
auth.ts
chat.ts
document.ts
knowledge.ts
sse.ts
```

规则：

- 请求、响应、params、query 和 SSE 事件由 Zod Schema 定义并推导 TypeScript 类型。
- Express 在系统边界执行校验。
- 前端关键响应可执行运行时校验。
- 页面不得自行拼接 API URL，只能调用集中 API Client。
- 每个前端 API 方法必须对应已注册 Express 路由和集成测试。
- CI 扫描页面中的裸 `/api/` 字符串，聊天专用 `streamChat()` 也必须使用共享路由构造函数。

## 7. REST 错误契约

统一格式：

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "文档不存在",
    "details": null,
    "requestId": "req_01HXYZ123"
  }
}
```

状态映射：

- 400：参数校验失败。
- 401：未认证或 Token 无效。
- 403：权限不足。
- 404：资源不存在。
- 409：唯一约束或状态冲突。
- 503：Kafka 等临时依赖不可用。
- 500：未知异常，不泄漏堆栈、SQL 或密钥。

Controller 不重复编写通用 `try/catch`；统一错误中间件负责序列化。

## 8. SSE 契约与生命周期

最小事件集：

```ts
type ChatStreamEvent =
  | { type: 'session'; conversationId: string; exchangeId: number }
  | { type: 'token'; content: string }
  | {
      type: 'done';
      conversationId: string;
      exchangeId: number;
      firstTokenLatencyMs?: number;
      totalLatencyMs: number;
    }
  | {
      type: 'error';
      code: string;
      message: string;
      retryable: boolean;
    };
```

规则：

1. 创建聊天任务后先发送 `session`。
2. 每个文本增量发送 `token`。
3. 成功持久化 Answer 和 Session 状态后发送且只发送一次 `done`。
4. 失败时先持久化失败状态，再发送且只发送一次 `error`。
5. `done` 和 `error` 互斥。
6. 心跳使用 SSE 注释，不伪装成业务事件。
7. 客户端断开触发 `AbortController`，阻止后续模型和持久化工作继续无界执行。
8. 代理关闭 SSE 缓冲。

前端解析器必须持久保存跨网络 chunk 的未完成 buffer，按完整 `\n\n` frame 提取事件，禁止将单个网络 chunk 当成完整 SSE event。

页面流状态：

```text
idle → submitting → streaming → completed
                            ├─ failed
                            └─ cancelled
```

## 9. Chat 应用编排

提取框架无关接口：

```text
runChat(input, callbacks, abortSignal)
```

职责：

1. 创建或读取 Session。
2. 在唯一入口创建一次 Exchange。
3. 组装近期上下文与长期摘要。
4. 执行 Query Rewrite 和 Knowledge Routing。
5. 先决定 Execution Mode。
6. 仅 RAG 模式执行向量与关键词召回。
7. Agent 模式调用 LangGraph。
8. 通过 callback 输出 token。
9. 完成后持久化 Answer、延迟和 Session 状态。
10. 非阻塞触发记忆压缩。
11. 失败或取消后更新 Exchange，并将 Session 恢复到 IDLE。

这一步必须修复：

- `prepareExecutionPlan()` 与旧 Route 重复创建 Exchange。
- OPEN_CHAT 已选 Agent 但旧 Route 仍提前执行 RAG 检索。
- Chat Route 混合 HTTP、模型、数据库和记忆职责。

Exchange 状态流程：

```text
事务：创建/读取 Session → 分配 exchangeId → 创建 RUNNING Exchange → Session ACTIVE
成功：Exchange COMPLETED → Session IDLE
失败/取消：Exchange FAILED/CANCELLED → Session IDLE
```

并发 exchangeId 分配依赖数据库约束、事务或冲突重试，不依赖无竞争假设。

## 10. 文档处理与一致性

### 10.1 上传

```text
接收并校验文件
→ 上传 MinIO
→ 创建文档记录
→ 创建解析任务
→ 投递 Kafka
→ 返回 202
```

Kafka 投递失败的补偿覆盖：

- 任务记录。
- 文档记录。
- 已上传 MinIO 对象。

补偿失败必须记录可追踪错误。第一阶段不引入 Outbox。

### 10.2 删除

清理范围：

- 文档任务。
- 结构节点。
- 业务分块和父块。
- PGVector 数据。
- Elasticsearch 文档。
- MinIO 原始文件和解析文本。
- 文档元数据。

跨存储删除采用可重试流程：

```text
标记 DELETING
→ 清理外部对象和索引
→ 数据库事务清理关联记录
→ 删除/标记文档完成
```

失败保留状态和错误，允许重试。

## 11. Kafka Worker

移除 `instrumentation.ts` 的 Consumer 启动职责。API 和 Worker 独立启动。

Worker 生命周期：

1. 校验配置。
2. 确保 Topic。
3. 启动 parse Consumer。
4. 启动 index Consumer。
5. 接收终止信号后停止拉取。
6. 等待当前任务结束。
7. 关闭 Kafka 和数据库资源。

### 11.1 Consumer Group 修复

当前同类 Consumer 使用不同 group ID，可能使每个 group 重复收到同一消息。迁移后：

```text
parse group: <base>-parse
index group: <base>-index
```

同类 Consumer 共享 group ID，由 Kafka 分配 partition。并发优先通过独立 Worker 实例扩展；单进程 Consumer 数量为显式配置。

### 11.2 重试与幂等

- 处理前读取任务状态。
- 已 COMPLETED 的任务直接跳过。
- 只有允许状态能转为 RUNNING。
- 重试更新 retryCount。
- 达上限标记 FAILED。
- 重复消息不得重复创建结构或索引。
- 索引清理与重建限定在 `documentId + taskId/planId` 范围。

第一阶段不引入死信 Topic。

## 12. 权限矩阵

| API | 匿名 | 登录用户 | 管理员 |
|---|---:|---:|---:|
| Chat | 由当前产品行为保持 | 是 | 是 |
| Session | 否 | 是 | 是 |
| Document Upload/Delete/Index | 否 | 否 | 是 |
| Knowledge CRUD | 否 | 否 | 是 |

第一阶段必须修复当前文档管理接口鉴权不一致的问题。

## 13. 健康检查和生命周期

Express 提供：

```text
GET /health/live
GET /health/ready
```

`live` 仅表示进程存活。`ready` 至少检查配置和核心 PostgreSQL；Redis、Kafka Producer 等依赖状态附加到响应。MinIO、Elasticsearch 和 LLM 局部故障不默认触发全站下线，避免局部能力故障造成重启风暴。

API 和 Worker 都必须响应 `SIGTERM`/`SIGINT`，有序关闭 HTTP、Kafka、Prisma、PG Pool 和 Redis。

## 14. 前端页面和虚空请求处理

现有不一致包括但不限于：

- 前端请求 `/api/chat/session/summary`，旧后端不存在。
- 前端请求文档删除和图谱接口，旧后端缺失。
- 前端 Knowledge `/save`、`/delete` 与旧后端 `/list` 多方法路由不一致。
- Session 前端发送 `pageNo`，旧后端读取 `page`。

迁移清单中每个请求必须被标记为：

- 已实现。
- 已替换。
- 已删除。

不允许保留后端不存在的 UI 操作。第一阶段补齐 Summary、Document Delete、Document Graph 等当前页面已有实际入口的后端能力；若现有数据模型无法合理支持某入口，则删除前端入口并在模块报告中说明。

## 15. 测试策略

### 15.1 单元测试

- Zod Schema。
- SSE 编码和解析。
- Chat 状态转换。
- JWT 提取。
- RRF 融合。
- Kafka 幂等判断。
- 错误状态映射。

### 15.2 Express 集成测试

使用 Supertest 覆盖：

- 参数和鉴权。
- 路由注册。
- 统一错误结构。
- REST Method 与契约。
- SSE 事件顺序和互斥终止。

### 15.3 真实中间件集成测试

用户已确认相关中间件服务已启动。实施时先探测再执行非破坏测试：

- PostgreSQL/Prisma：隔离记录。
- Redis：唯一测试 key。
- MinIO：唯一对象前缀。
- Elasticsearch：隔离 ID 或测试索引。
- pgvector：仅本次测试文档。
- Kafka：测试消息 key 和独立测试 group。

测试后清理本次数据。禁止清空表、删除正式 Topic/Bucket、重建正式索引或操作来源不明的数据。

### 15.4 前端测试

- API Client 与共享路由一致。
- SSE frame 横跨多个 chunk 不丢事件。
- done/error/cancel 状态。
- 页面不存在无后端实现的操作。
- 核心页面通过真实 API 冒烟测试。

## 16. 模块完成门槛与回滚

模块完成需要：

1. 实现完整。
2. 相关测试通过。
3. TypeScript 类型检查通过。
4. 相关包构建通过。
5. 真实依赖冒烟测试通过，或明确记录外部阻塞。
6. diff 只包含当前模块预期文件。
7. 无密钥、构建产物和无关未跟踪文件。
8. 独立 commit。
9. 成功推送远端功能分支。

迁移期间旧 `app/api` 作为参照保留。删除旧 Next.js 后端运行时是最后一个独立 commit，要求：

- 所有 Express 路由完成。
- 所有前端调用切换。
- 契约扫描无遗漏。
- SSE 和 Worker 冒烟测试通过。
- 全量构建通过。

## 17. 第一阶段上下文检查点

第一阶段完成后生成检查点总结：

- 最终目录。
- 路由清单。
- API/Worker 启动方式。
- 环境变量。
- 已修复问题。
- 测试结果。
- commit 和远端分支。
- 剩余风险。
- 第二阶段关键文件。

该总结用于后续上下文压缩和恢复。平台级上下文压缩由运行环境执行；任务侧负责提供完整、可恢复的阶段总结。

## 18. 第二阶段：LangChain 统一

第二阶段在第一阶段全量验证后，从干净基线创建独立分支，例如：

```text
feat/langchain-provider-unification
```

迁移顺序：

1. 统一 ChatModel/EmbeddingModel Provider。
2. Query Rewrite → LangChain structured output。
3. Memory Summary → structured output。
4. Embedding → `OpenAIEmbeddings`。
5. RAG 普通回答 → `ChatOpenAI.stream()`。
6. Express SSE 接入新模型流。
7. 回归 LangGraph Agent。
8. 删除原生 `openai` SDK。
9. 清理重复类型、配置和错误处理。
10. 真实 Qwen-compatible 集成测试。

职责边界：

- LangChain：模型、Embedding、structured output。
- LangGraph：多步骤 Agent、工具和状态编排。
- 普通 TypeScript：RRF、JWT、分页、事务、Kafka 状态、文件处理等确定性逻辑。

第二阶段验收：

- 生产代码不直接导入 `openai`。
- 普通聊天、Embedding 和结构化输出统一走 Provider。
- LangGraph Agent 行为保持。
- Query Rewrite 和 Memory Summary 不再手写脆弱 JSON 解析。
- Embedding 维度和输入顺序不变。
- SSE 对外契约不变。
- Qwen 的 streaming、tool calling 和 structured output 经真实接口验证。
- 全量测试通过后才移除 `openai` 依赖。

## 19. 整体成功标准

完成后系统为：

```text
Next.js Frontend
  └─ Shared-contract API Client + SSE Parser

Express API
  ├─ Auth / Session / Knowledge / Document
  ├─ Chat Orchestrator
  ├─ LangChain Model + Embedding
  └─ LangGraph Agent

Kafka Worker
  └─ Parse / Strategy / Index Pipeline
```

并满足：

- 前端无虚空请求。
- 后端不依赖 Next.js 运行时。
- API 扩容不增加 Worker Consumer。
- 同类 Kafka Consumer 使用正确 group。
- LangChain 与 LangGraph 职责清晰。
- 每个模块有独立、已推送、可回滚的 commit。
- 测试覆盖真实中间件、SSE 分片和主要页面流程。
