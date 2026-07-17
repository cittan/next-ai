# Next.js AI 项目深度技术文档

> 本文档基于 `next-ai-渐进式实现指南` 前 70 步，对项目代码进行全面解析

---

## 一、项目全景概览

### 1.1 项目定位

本项目是 `next-ai-渐进式实现指南` 前 70 步的完整实战落地，实现了从基础对话到文档索引的全流程功能。

**核心功能模块**：
- ✅ 基础 AI 对话（步骤 1-11）
- ✅ 会话管理系统（步骤 12-25）
- ✅ 聊天历史记录（步骤 26-30）
- ✅ 管理员认证（步骤 31-42）
- ✅ 记忆压缩系统（步骤 43-50）
- ✅ 文档上传与解析（步骤 51-61）
- ✅ 向量化与索引构建（步骤 62-70）

### 1.2 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                    前端 (React + Next.js)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  聊天界面    │  │  会话列表    │  │  文档管理    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓ HTTP/SSE
┌─────────────────────────────────────────────────────────┐
│                 后端 (Next.js API Routes)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  /api/chat   │  │ /api/session │  │ /api/manage  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                      服务层 (Service)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Conversation │  │   Memory     │  │  Document    │  │
│  │  Manager     │  │   Store      │  │  Repository  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    数据访问层 (Prisma)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Business   │  │  Knowledge   │  │   PGVector   │  │
│  │   Prisma     │  │   Prisma     │  │    Pool      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                      数据存储层                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │PostgreSQL│ │PostgreSQL│ │  Redis   │ │  MinIO   │  │
│  │ Business │ │Knowledge │ │  Cache   │ │  Files   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐                             │
│  │PGVector  │ │   ES     │                             │
│  │ Vectors  │ │ Search   │                             │
│  └──────────┘ └──────────┘                             │
└─────────────────────────────────────────────────────────┘
```

### 1.3 核心技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 前端框架 | Next.js 15 + React 19 | SSR/CSR 混合渲染 |
| 后端框架 | Next.js API Routes | RESTful API + SSE 流式 |
| ORM | Prisma 7 | 数据库访问与迁移 |
| AI 服务 | OpenAI SDK (DashScope) | 聊天补全 + 向量化 |
| 向量数据库 | PostgreSQL + pgvector | 向量存储与相似度搜索 |
| 搜索引擎 | Elasticsearch 8 | 全文检索 |
| 对象存储 | MinIO | 文件存储 |
| 缓存 | Redis | 会话缓存 |

---

## 二、文件职责深度解析

### 2.1 Prisma Schema 详解

#### 2.1.1 业务数据库 (db-business/schema.prisma)

**ConversationSession 模型**：
```prisma
model ConversationSession {
  id                 Int        @id @default(autoincrement())
  conversationId     String     @unique @db.Uuid  // UUID 唯一标识
  chatMode           String     @default("OPEN_CHAT")  // 聊天模式
  status             Int        @default(1)  // 状态：0-空闲, 1-活跃, 2-归档
  title              String?    // 会话标题
  selectedDocumentId Int?       // 选中的文档 ID
  userId             Int?       @map("user_id")  // 用户 ID
  user               AdminUser? @relation(...)  // 关联用户
  createTime         DateTime   @default(now()) @db.Timestamp(6)
  editTime           DateTime   @updatedAt @db.Timestamp(6)

  exchanges       ConversationExchange[]  // 一对多：交换记录
  memorySummaries ConversationMemorySummary[]  // 一对多：记忆摘要

  @@map("conversation_session")  // 映射到数据库表名
}
```

**字段设计意图**：
- `conversationId`：使用 UUID 而非自增 ID，避免 URL 中暴露业务量
- `status`：整型枚举，便于状态机管理
- `@db.Timestamp(6)`：微秒精度，支持高精度时间戳
- `@updatedAt`：自动更新时间戳，无需手动维护

**ConversationExchange 模型**：
```prisma
model ConversationExchange {
  id                  Int      @id @default(autoincrement())
  conversationId      String   @db.Uuid  // 外键关联会话
  exchangeId          Int      // 交换序号（会话内递增）
  question            String   @db.Text  // 用户问题
  answer              String?  @db.Text  // AI 回答
  mode                String   @default("OPEN_CHAT")  // 执行模式
  exchangeState       Int      @default(1)  // 状态：0-开始, 1-进行中, 2-完成, 3-失败
  firstTokenLatencyMs Int?     // 首 token 延迟（毫秒）
  totalLatencyMs      Int?     // 总延迟（毫秒）
  createTime          DateTime @default(now()) @db.Timestamp(6)

  session ConversationSession @relation(...)  // 多对一：关联会话

  @@unique([conversationId, exchangeId])  // 复合唯一约束
  @@map("conversation_exchange")
}
```

**设计亮点**：
- `exchangeId`：会话内递增，便于排序和定位
- `firstTokenLatencyMs`：性能监控指标，优化用户体验
- `@@unique([conversationId, exchangeId])`：确保同一会话内交换序号唯一

**ConversationMemorySummary 模型**：
```prisma
model ConversationMemorySummary {
  id                Int      @id @default(autoincrement())
  conversationId    String   @db.Uuid
  coveredExchangeId Int      // 覆盖到的交换 ID
  summary           String?  @db.Text  // 摘要文本
  conversationGoal  String?  @db.Text  // 对话目标
  stableFacts       Json?    // 稳定事实（JSON 数组）
  pendingQuestions  Json?    // 待解决问题
  retrievalHints    Json?    // 检索提示
  resolvedPoints    Json?    // 已解决点
  compressionCount  Int      @default(0)  // 压缩次数
  tokenUsed         Int?     // 消耗的 token 数
  createTime        DateTime @default(now()) @db.Timestamp(6)

  session ConversationSession @relation(...)

  @@map("conversation_memory_summary")
}
```

**记忆压缩设计**：
- `coveredExchangeId`：标记压缩覆盖到哪个交换，支持增量压缩
- `compressionCount`：记录压缩次数，便于追踪压缩历史
- `Json?` 类型字段：存储结构化数据，Prisma 自动处理序列化/反序列化

#### 2.1.2 知识库数据库 (db-knowledge/schema.prisma)

**SuperAgentDocument 模型**：
```prisma
model SuperAgentDocument {
  id                  Int      @id @default(autoincrement())
  documentName        String   @map("document_name")  // 文档名称
  originalFileName    String?  @map("original_file_name")  // 原始文件名
  fileType            Int?     @map("file_type")  // 文件类型：1-PDF, 2-DOCX, 3-TXT, 4-MD, 5-HTML
  mimeType            String?  @map("mime_type")  // MIME 类型
  fileSize            BigInt?  @map("file_size")  // 文件大小（字节）
  storageType         Int?     @map("storage_type")  // 存储类型
  bucketName          String?  @map("bucket_name")  // MinIO 桶名
  objectName          String?  @map("object_name")  // MinIO 对象路径
  objectUrl           String?  @map("object_url")  // 对象 URL
  parseStatus         Int      @default(1) @map("parse_status")  // 解析状态：1-待解析, 2-已解析, 3-失败
  strategyStatus      Int      @default(1) @map("strategy_status")  // 策略状态
  indexStatus         Int      @default(1) @map("index_status")  // 索引状态：0-待索引, 1-索引中, 2-已完成
  charCount           Int?     @map("char_count")  // 字符数
  tokenCount          Int?     @map("token_count")  // token 数
  parseTextPath       String?  @map("parse_text_path")  // 解析后文本路径
  parseErrorMsg       String?  @map("parse_error_msg")  // 解析错误信息
  knowledgeScopeCode  String?  @map("knowledge_scope_code")  // 知识范围编码
  knowledgeScopeName  String?  @map("knowledge_scope_name")  // 知识范围名称
  businessCategory    String?  @map("business_category")  // 业务分类
  documentTags        String?  @map("document_tags")  // 文档标签
  currentPlanId       Int?     @map("current_plan_id")  // 当前计划 ID
  lastParseTaskId     Int?     @map("last_parse_task_id")  // 最后解析任务 ID
  structureNodeCount  Int?     @map("structure_node_count")  // 结构节点数
  lastIndexTaskId     Int?     @map("last_index_task_id")  // 最后索引任务 ID
  status              Int      @default(1)  // 文档状态
  createTime          DateTime @default(now()) @map("create_time") @db.Timestamp(6)
  updateTime          DateTime @updatedAt @map("edit_time") @db.Timestamp(6)

  chunks         DocumentChunkBusiness[]  // 业务分块
  structureNodes DocumentStructureNode[]  // 结构节点
  parentBlocks   DocumentParentBlock[]    // 父块
  tasks          DocumentTask[]           // 任务
  strategies     DocumentStrategyPlan[]   // 策略计划

  @@map("super_agent_document")
}
```

**关键设计**：
- `fileSize: BigInt?`：支持大文件（> 2GB），Prisma 映射为 PostgreSQL 的 `bigint`
- `parseTextPath`：存储解析后文本的 MinIO 路径，而非原始文件名
- 状态字段使用整型枚举：便于扩展和查询优化

**DocumentChunk 模型（向量存储表）**：
```prisma
model DocumentChunk {
  id           Int     @id @default(autoincrement())
  documentId   Int     @map("document_id")  // 关联文档
  chunkId      Int     @unique @map("chunk_id")  // 分块 ID（文档内唯一）
  chunkText    String? @map("chunk_text") @db.Text  // 分块文本
  sectionPath  String? @map("section_path")  // 章节路径
  embedding    Json?   // pgvector 向量（Prisma 用 Json 表示）
  vectorStatus Int?    @default(1) @map("vector_status")  // 向量状态：1-待向量化, 2-已向量化

  @@map("document_chunk")
}
```

**设计说明**：
- `chunkId`：文档内唯一，用于定位分块
- `embedding: Json?`：Prisma 不直接支持 pgvector，用 Json 类型存储，实际数据库为 `vector` 类型
- `vectorStatus`：追踪向量化进度

**DocumentChunkBusiness 模型（业务分块表）**：
```prisma
model DocumentChunkBusiness {
  id                Int      @id @default(autoincrement())
  documentId        Int      @map("document_id")
  taskId            Int?     @map("task_id")
  planId            Int?     @map("plan_id")
  parentBlockId     Int?     @map("parent_block_id")
  chunkNo           Int?     @map("chunk_no")  // 分块序号
  sourceType        Int?     @map("source_type")  // 来源类型
  sectionPath       String?  @map("section_path")  // 章节路径
  structureNodeId   Int?     @map("structure_node_id")  // 结构节点 ID
  structureNodeType Int?     @map("structure_node_type")  // 结构节点类型
  canonicalPath     String?  @map("canonical_path")  // 规范路径
  itemIndex         Int?     @map("item_index")  // 项目索引
  chunkText         String?  @map("chunk_text") @db.Text
  charCount         Int?     @map("char_count")  // 字符数
  tokenCount        Int?     @map("token_count")  // token 数
  vectorStatus      Int?     @default(1) @map("vector_status")
  vectorStoreType   Int?     @map("vector_store_type")  // 向量存储类型
  vectorId          String?  @map("vector_id")  // 向量 ID
  createTime        DateTime @default(now()) @map("create_time") @db.Timestamp(6)

  document    SuperAgentDocument   @relation(fields: [documentId], references: [id], onDelete: Cascade)
  parentBlock DocumentParentBlock? @relation(fields: [parentBlockId], references: [id])

  @@map("document_chunk_business")
}
```

**双表设计原因**：
- `document_chunk`：纯向量存储，用于相似度搜索
- `document_chunk_business`：业务信息，包含分块策略、结构关系等
- 分离关注点：向量操作不影响业务数据，业务调整不影响向量索引

### 2.2 API 路由解析

#### 2.2.1 聊天 API (`app/api/chat/route.ts`)

**核心流程**：
```typescript
export async function POST(req: NextRequest): Promise<NextResponse> {
    // 1. 解析请求体
    const body = await req.json() as ChatRequestDto;
    
    // 2. 组装记忆上下文
    const context = await assembleContext(conversationId, memoryStore);
    
    // 3. 构建消息列表（包含长期记忆 + 近期对话）
    const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
    ];
    
    // 4. 创建/获取会话
    let session = await conversationManager.getSession(conversationId);
    if (!session) {
        await conversationManager.createSession({ conversationId, chatMode: 'OPEN_CHAT' });
    }
    
    // 5. 创建交换记录
    const exchangeId = await conversationManager.getLatestExchangeId(conversationId) + 1;
    await conversationManager.createExchange({ conversationId, exchangeId, question: body.question });
    
    // 6. SSE 流式响应
    const stream = new ReadableStream({
        async start(controller) {
            // 发送 conversationId
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ conversationId })}\n\n`));
            
            // 流式输出 AI 回答
            for await (const chunk of streamChatCompletion(messages)) {
                if (chunk.content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", content: chunk.content })}\n\n`));
                }
                if (chunk.finishReason === 'stop') {
                    // 完成交换记录
                    await conversationManager.completeExchange({...});
                    // 异步压缩记忆
                    (async () => {
                        if (shouldCompress(latest, recent)) {
                            await compressMemory({...});
                        }
                    })();
                }
            }
        }
    });
    
    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}
```

**关键技术点**：
- **SSE (Server-Sent Events)**：单向流式传输，适合 AI 流式输出
- **ReadableStream**：Web Streams API，支持异步推送数据
- **异步记忆压缩**：不阻塞主流程，后台执行压缩任务

#### 2.2.2 会话管理 API

**列表查询 (`app/api/chat/session/list/route.ts`)**：
```typescript
export async function GET(r: NextRequest) {
    const url = new URL(r.url);
    const keyword = url.searchParams.get('keyword') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    
    const result = await conversationManager.listSessions({
        keyword,
        pageNo: page,
        pageSize
    });
    
    return NextResponse.json(result);
}
```

**会话操作 (`app/api/chat/session/[action]/route.ts`)**：
```typescript
export async function POST(
    r: NextRequest,
    { params }: { params: Promise<{ action: string }> }
) {
    const { action } = await params;
    const url = new URL(r.url);
    const conversationId = url.searchParams.get('conversationId');
    
    switch (action) {
        case 'rename':
            const title = url.searchParams.get('title');
            await conversationManager.renameSession({ conversationId, title });
            break;
        case 'delete':
            await conversationManager.deleteSession({ conversationId });
            break;
        case 'reset':
            await conversationManager.resetSession({ conversationId });
            break;
    }
    
    return NextResponse.json({ ok: true });
}
```

**动态路由设计**：
- `[action]`：动态路由段，支持 `rename`、`delete`、`reset` 等操作
- 统一入口，减少路由文件数量

#### 2.2.3 文档管理 API

**文件上传 (`app/api/manage/document/upload/route.ts`)**：
```typescript
export async function POST(r: NextRequest) {
    const formData = await r.formData();
    const file = formData.get('file') as File;
    
    // 1. 上传原始文件到 MinIO
    const objectName = await uploadFile(
        Buffer.from(await file.arrayBuffer()),
        file.name,
        file.type
    );
    
    // 2. 解析文档内容
    const format = detectFormat(file.name);
    const text = await parseDocument(Buffer.from(await file.arrayBuffer()), format);
    
    // 3. 上传解析后文本到 MinIO
    const parsedTextPath = await uploadFile(
        Buffer.from(text),
        `${file.name}.txt`,
        'text/plain'
    );
    
    // 4. 创建文档记录
    const doc = await documentRepository.create({
        documentName: file.name,
        fileType: FileTypeMap[format],
        fileSize: file.size,
        objectName,
        parseTextPath,
    });
    
    return NextResponse.json({ success: true, documentId: doc.id });
}
```

**索引构建 (`app/api/manage/document/index/build/route.ts`)**：
```typescript
export async function POST(r: NextRequest) {
    const { documentId } = await r.json();
    
    // 1. 获取文档信息
    const doc = await documentRepository.findById(documentId);
    
    // 2. 下载解析后文本
    const textBuffer = await downloadFromMinio(doc.parseTextPath);
    const text = textBuffer.toString('utf-8');
    
    // 3. 文本分块
    const chunks = await splitText(text);
    
    // 4. 创建业务分块记录
    const businessChunks = await Promise.all(
        chunks.map((chunk, index) =>
            prisma.documentChunkBusiness.create({
                data: {
                    documentId,
                    chunkNo: index + 1,
                    chunkText: chunk,
                    vectorStatus: 1,
                }
            })
        )
    );
    
    // 5. 创建向量分块记录
    await Promise.all(
        businessChunks.map(chunk =>
            prisma.documentChunk.create({
                data: {
                    documentId,
                    chunkId: chunk.id,
                    chunkText: chunk.chunkText,
                    vectorStatus: 1,
                }
            })
        )
    );
    
    // 6. 向量化
    await vectorizeChunks(
        businessChunks.map(c => ({
            documentId,
            chunkId: c.id,
            content: c.chunkText || ''
        }))
    );
    
    // 7. 索引到 Elasticsearch
    await indexChunksToEs(
        businessChunks.map(c => ({
            documentId,
            documentName: doc.documentName,
            chunkId: c.id,
            chunkContent: c.chunkText || '',
            sectionPath: c.sectionPath || ''
        }))
    );
    
    // 8. 更新文档索引状态
    await documentRepository.update(documentId, { indexStatus: 2 });
    
    return NextResponse.json({ success: true, indexedChunks: chunks.length });
}
```

### 2.3 服务层实现

#### 2.3.1 ConversationManager (`lib/service/chat/ConversationManager.ts`)

**核心方法**：

```typescript
export class ConversationManager {
    private get prisma() {
        return getBusinessPrisma();
    }
    
    // 创建会话
    async createSession(p: { conversationId: string; chatMode: string; userId?: number }) {
        await this.prisma.conversationSession.create({
            data: {
                conversationId: p.conversationId,
                chatMode: p.chatMode,
                status: ChatSessionStatus.IDLE,
                userId: p.userId ?? null
            }
        });
    }
    
    // 获取会话详情（包含交换计数和首条问题）
    async getSession(conversationId: string) {
        const row = await this.prisma.conversationSession.findUnique({
            where: { conversationId },
            include: {
                _count: { select: { exchanges: true } },
                exchanges: {
                    orderBy: { exchangeId: 'asc' },
                    take: 1,
                    select: { question: true }
                }
            }
        });
        
        if (!row) return null;
        
        return {
            conversationId: row.conversationId,
            chatMode: row.chatMode,
            status: row.status as ChatSessionStatus,
            title: row.title || row.exchanges[0]?.question || '新对话',
            userId: row.userId ?? undefined,
            exchangeCount: row._count.exchanges,
            createTime: row.createTime,
            editTime: row.editTime
        };
    }
    
    // 分页查询会话列表
    async listSessions(p: { keyword?: string; pageNo: number; pageSize: number }) {
        const where: any = {};
        if (p.keyword) {
            where.title = { contains: p.keyword };
        }
        
        const [total, rows] = await Promise.all([
            this.prisma.conversationSession.count({ where }),
            this.prisma.conversationSession.findMany({
                where,
                orderBy: { editTime: 'desc' },
                skip: (p.pageNo - 1) * p.pageSize,
                take: p.pageSize,
                include: {
                    _count: { select: { exchanges: true } },
                    exchanges: {
                        orderBy: { exchangeId: 'asc' },
                        take: 1,
                        select: { question: true }
                    }
                }
            })
        ]);
        
        return {
            sessions: rows.map(r => ({
                conversationId: r.conversationId,
                chatMode: r.chatMode,
                status: r.status as ChatSessionStatus,
                title: r.title || r.exchanges[0]?.question || '新对话',
                exchangeCount: r._count.exchanges,
                createTime: r.createTime,
                editTime: r.editTime
            })),
            total
        };
    }
    
    // 重置会话（事务操作）
    async resetSession(p: { conversationId: string }) {
        const result = await this.prisma.$transaction(async (tx) => {
            const r = await tx.conversationExchange.deleteMany({
                where: { conversationId: p.conversationId }
            });
            await tx.conversationMemorySummary.deleteMany({
                where: { conversationId: p.conversationId }
            });
            await tx.conversationSession.update({
                where: { conversationId: p.conversationId },
                data: { status: ChatSessionStatus.IDLE }
            });
            return r.count;
        });
        return result;
    }
    
    // 创建交换记录
    async createExchange(p: { conversationId: string; exchangeId: number; question: string }) {
        await this.prisma.conversationExchange.create({
            data: {
                conversationId: p.conversationId,
                exchangeId: p.exchangeId,
                question: p.question,
                answer: '',
                mode: 'OPEN_CHAT',
                exchangeState: 1
            }
        });
    }
    
    // 完成交换记录
    async completeExchange(p: {
        conversationId: string;
        exchangeId: number;
        answer: string;
        exchangeState: number;
        firstTokenLatencyMs?: number;
        totalLatencyMs?: number;
        finishNote?: string;
    }) {
        await this.prisma.conversationExchange.updateMany({
            where: {
                conversationId: p.conversationId,
                exchangeId: p.exchangeId
            },
            data: {
                answer: p.answer,
                exchangeState: p.exchangeState,
                finishNote: p.finishNote ?? null,
                firstTokenLatencyMs: p.firstTokenLatencyMs ?? null,
                totalLatencyMs: p.totalLatencyMs ?? null
            }
        });
    }
    
    // 获取最新交换
    async getLatestExchange(conversationId: string) {
        const exchange = await this.prisma.conversationExchange.findFirst({
            where: { conversationId },
            orderBy: { exchangeId: 'desc' }
        });
        return exchange;
    }
    
    // 获取最新交换 ID
    async getLatestExchangeId(conversationId: string) {
        const exchange = await this.getLatestExchange(conversationId);
        return exchange?.exchangeId || 0;
    }
    
    // 获取近期交换
    async getRecentExchanges(conversationId: string, limit: number) {
        return await this.prisma.conversationExchange.findMany({
            where: { conversationId },
            orderBy: { exchangeId: 'desc' },
            take: limit
        });
    }
    
    // 重命名会话
    async renameSession(p: { conversationId: string; title: string }) {
        await this.prisma.conversationSession.update({
            where: { conversationId: p.conversationId },
            data: { title: p.title }
        });
    }
    
    // 删除会话
    async deleteSession(p: { conversationId: string }) {
        await this.prisma.conversationSession.delete({
            where: { conversationId: p.conversationId }
        });
    }
}
```

**设计亮点**：
- **单例模式**：通过 `getBusinessPrisma()` 获取 Prisma 客户端，确保全局唯一
- **事务支持**：`resetSession` 使用 `$transaction` 保证原子性
- **分页查询**：`listSessions` 支持关键词搜索和分页
- **关联查询**：使用 `include` 预加载关联数据，避免 N+1 问题

#### 2.3.2 记忆系统 (`lib/service/memory/`)

**memoryStore.ts - 记忆存储**：
```typescript
export interface MemorySummary {
    summary?: string;
    conversationGoal?: string;
    stableFacts?: string[];
    pendingQuestions?: string[];
    retrievalHints?: string[];
    resolvedPoints?: string[];
    compressionCount: number;
    tokenUsed?: number;
}

export class MemoryStore {
    private get prisma() {
        return getBusinessPrisma();
    }
    
    // 保存记忆摘要
    async saveSummary(conversationId: string, summary: MemorySummary, coveredExchangeId: number) {
        await this.prisma.conversationMemorySummary.upsert({
            where: { conversationId },
            update: {
                ...summary,
                stableFacts: summary.stableFacts || [],
                pendingQuestions: summary.pendingQuestions || [],
                retrievalHints: summary.retrievalHints || [],
                resolvedPoints: summary.resolvedPoints || [],
                coveredExchangeId
            },
            create: {
                conversationId,
                ...summary,
                stableFacts: summary.stableFacts || [],
                pendingQuestions: summary.pendingQuestions || [],
                retrievalHints: summary.retrievalHints || [],
                resolvedPoints: summary.resolvedPoints || [],
                coveredExchangeId
            }
        });
    }
    
    // 获取记忆摘要
    async getSummary(conversationId: string): Promise<MemorySummary | null> {
        const row = await this.prisma.conversationMemorySummary.findUnique({
            where: { conversationId }
        });
        if (!row) return null;
        return {
            summary: row.summary || undefined,
            conversationGoal: row.conversationGoal || undefined,
            stableFacts: row.stableFacts as string[] | undefined,
            pendingQuestions: row.pendingQuestions as string[] | undefined,
            retrievalHints: row.retrievalHints as string[] | undefined,
            resolvedPoints: row.resolvedPoints as string[] | undefined,
            compressionCount: row.compressionCount,
            tokenUsed: row.tokenUsed || undefined
        };
    }
}
```

**memorySummrizer.ts - 记忆压缩**：
```typescript
export async function compressMemory(params: {
    conversationId: string;
    exchanges: ConversationExchange[];
    currentSummary?: MemorySummary;
    coveredExchangeId: number;
}): Promise<MemorySummary> {
    const { conversationId, exchanges, currentSummary, coveredExchangeId } = params;
    
    // 1. 构建压缩提示词
    const prompt = buildCompressionPrompt(exchanges, currentSummary);
    
    // 2. 调用 AI 进行压缩
    const response = await getAiClient().chat.completions.create({
        model: 'qwen-plus',
        messages: [
            { role: 'system', content: '你是一个记忆压缩助手...' },
            { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
    });
    
    // 3. 解析压缩结果
    const compressed = JSON.parse(response.choices[0].message.content || '{}');
    
    // 4. 保存到数据库
    await memoryStore.saveSummary(conversationId, compressed, coveredExchangeId);
    
    return compressed;
}
```

**contextAssembler.ts - 上下文组装**：
```typescript
export async function assembleContext(
    conversationId: string,
    memoryStore: MemoryStore
): Promise<ContextResult> {
    // 1. 获取记忆摘要
    const summary = await memoryStore.getSummary(conversationId);
    
    // 2. 获取近期对话（未被压缩覆盖的部分）
    const recentExchanges = await conversationManager.getRecentExchanges(
        conversationId,
        10  // 最近 10 轮对话
    );
    
    // 3. 过滤掉已被压缩覆盖的对话
    const filteredExchanges = summary
        ? recentExchanges.filter(e => e.exchangeId > (summary.coveredExchangeId || 0))
        : recentExchanges;
    
    return {
        summary,
        recentExchanges: filteredExchanges
    };
}
```

**记忆压缩流程**：
```
用户提问 → 组装上下文（记忆摘要 + 近期对话）
         ↓
    AI 生成回答 → 检查是否需要压缩
         ↓
    需要压缩？ → 调用 AI 压缩记忆 → 保存摘要
         ↓
    不需要 → 继续对话
```

#### 2.3.3 文档服务 (`lib/service/document/`)

**documentRepository.ts - 文档存储库**：
```typescript
export class DocumentRepository {
    private get prisma() {
        return getKnowledgePrisma();
    }
    
    // 创建文档
    async create(data: {
        documentName: string;
        fileType?: number;
        fileSize?: number;
        objectName?: string;
        parseTextPath?: string;
    }) {
        return await this.prisma.superAgentDocument.create({
            data: {
                documentName: data.documentName,
                fileType: data.fileType,
                fileSize: data.fileSize ? BigInt(data.fileSize) : null,
                objectName: data.objectName,
                parseTextPath: data.parseTextPath,
                parseStatus: 2,  // 已解析
                indexStatus: 1   // 待索引
            }
        });
    }
    
    // 根据 ID 查找
    async findById(id: number) {
        return await this.prisma.superAgentDocument.findUnique({
            where: { id }
        });
    }
    
    // 分页查询
    async findPage(params: { pageNo: number; pageSize: number; keyword?: string }) {
        const where = params.keyword
            ? { documentName: { contains: params.keyword } }
            : {};
        
        const [total, list] = await Promise.all([
            this.prisma.superAgentDocument.count({ where }),
            this.prisma.superAgentDocument.findMany({
                where,
                orderBy: { createTime: 'desc' },
                skip: (params.pageNo - 1) * params.pageSize,
                take: params.pageSize
            })
        ]);
        
        return {
            list: list.map(doc => ({
                ...doc,
                fileSize: doc.fileSize ? Number(doc.fileSize) : null  // BigInt 转 Number
            })),
            total
        };
    }
    
    // 更新文档
    async update(id: number, data: Partial<SuperAgentDocument>) {
        return await this.prisma.superAgentDocument.update({
            where: { id },
            data
        });
    }
    
    // 删除文档
    async delete(id: number) {
        return await this.prisma.superAgentDocument.delete({
            where: { id }
        });
    }
}
```

**storageService.ts - 存储服务**：
```typescript
export async function uploadFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string
): Promise<string> {
    const minio = getMinioClient();
    const bucketName = process.env.MINIO_BUCKET_NAME || 'super-agent-document';
    const objectName = `${Date.now()}-${fileName}`;
    
    await minio.putObject(bucketName, objectName, buffer, {
        'Content-Type': mimeType
    });
    
    return objectName;
}

export async function downloadFromMinio(objectName: string): Promise<Buffer> {
    const minio = getMinioClient();
    const bucketName = process.env.MINIO_BUCKET_NAME || 'super-agent-document';
    
    const stream = await minio.getObject(bucketName, objectName);
    const chunks: Buffer[] = [];
    
    for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
    }
    
    return Buffer.concat(chunks);
}
```

**parserService.ts - 文档解析**：
```typescript
export async function parseDocument(
    buffer: Buffer,
    format: DocumentFormat
): Promise<string> {
    switch (format) {
        case 'txt':
        case 'md':
            return buffer.toString('utf-8');
        case 'pdf':
            return await parsePdf(buffer);
        case 'docx':
            return await parseDocx(buffer);
        default:
            throw new Error(`Unsupported format: ${format}`);
    }
}

async function parsePdf(buffer: Buffer): Promise<string> {
    // 使用 pdf-parse 库解析 PDF
    const pdf = await pdfParse(buffer);
    return pdf.text;
}

async function parseDocx(buffer: Buffer): Promise<string> {
    // 使用 mammoth 库解析 DOCX
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
}
```

**vectorGatway.ts - 向量化网关**：
```typescript
export async function vectorizeChunks(chunks: {
    documentId: number;
    chunkId: number;
    content: string;
}[]): Promise<void> {
    const pool = getPgVectorPool();
    
    // 1. 批量向量化
    const embeddings = await embedTexts(chunks.map(c => c.content));
    
    // 2. 写入数据库
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        for (let i = 0; i < chunks.length; i++) {
            const embedding = `[${embeddings[i].join(',')}]`;
            await client.query(
                `UPDATE document_chunk 
                 SET embedding = $1::vector, vector_status = 2 
                 WHERE document_id = $2 AND chunk_id = $3`,
                [embedding, chunks[i].documentId, chunks[i].chunkId]
            );
        }
        
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
```

**keywordService.ts - 关键词服务**：
```typescript
export async function indexChunksToEs(chunks: {
    documentId: number;
    documentName: string;
    chunkId: number;
    chunkContent: string;
    sectionPath: string;
}[]): Promise<void> {
    const es = getEsClient();
    const indexName = 'document_chunks';
    
    // 批量索引
    const body = chunks.flatMap(chunk => [
        { index: { _index: indexName, _id: `${chunk.documentId}-${chunk.chunkId}` } },
        {
            document_id: chunk.documentId,
            document_name: chunk.documentName,
            chunk_id: chunk.chunkId,
            chunk_content: chunk.chunkContent,
            section_path: chunk.sectionPath
        }
    ]);
    
    await es.bulk({ body });
}

export async function searchByKeyword(keyword: string): Promise<any[]> {
    const es = getEsClient();
    
    const result = await es.search({
        index: 'document_chunks',
        body: {
            query: {
                match: {
                    chunk_content: keyword
                }
            }
        }
    });
    
    return result.hits.hits.map(hit => hit._source);
}
```

### 2.4 工具库解析 (`lib/`)

#### 2.4.1 config.ts - 配置管理

```typescript
export interface AppConfig {
    // AI 配置
    ai: {
        baseUrl: string;
        apiKey: string;
        defaultModel: string;
        embeddingModel: string;
    };
    // 数据库配置
    pgsql: {
        businessUrl: string;
        knowledgeUrl: string;
    };
    redis: {
        url: string;
    };
    // MinIO 配置
    minio: {
        endPoint: string;
        port: number;
        useSSL: boolean;
        accessKey: string;
        secretKey: string;
        bucketName: string;
    };
    // Elasticsearch 配置
    elasticsearch: {
        node: string;
        auth: {
            username: string;
            password: string;
        };
    };
    // 连接池配置
    maxPoolSize: number;
    poolName: string;
    minIdle: number;
}

export function loadConfig(): AppConfig {
    return {
        ai: {
            baseUrl: process.env.AI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
            apiKey: process.env.AI_API_KEY || '',
            defaultModel: process.env.AI_DEFAULT_MODEL || 'qwen-plus',
            embeddingModel: process.env.AI_EMBEDDING_MODEL || 'text-embedding-v3'
        },
        pgsql: {
            businessUrl: process.env.BUSINESS_DB_URL || '',
            knowledgeUrl: process.env.KNOWLEDGE_DB_URL || ''
        },
        redis: {
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        },
        minio: {
            endPoint: process.env.MINIO_ENDPOINT || 'localhost',
            port: parseInt(process.env.MINIO_PORT || '9000'),
            useSSL: process.env.MINIO_USE_SSL === 'true',
            accessKey: process.env.MINIO_ACCESS_KEY || '',
            secretKey: process.env.MINIO_SECRET_KEY || '',
            bucketName: process.env.MINIO_BUCKET_NAME || 'super-agent-document'
        },
        elasticsearch: {
            node: process.env.ES_NODE || 'http://localhost:9200',
            auth: {
                username: process.env.ES_USERNAME || 'elastic',
                password: process.env.ES_PASSWORD || ''
            }
        },
        maxPoolSize: parseInt(process.env.MAX_POOL_SIZE || '10'),
        poolName: process.env.POOL_NAME || 'default',
        minIdle: parseInt(process.env.MIN_IDLE || '2')
    };
}
```

**设计原则**：
- **环境变量优先**：所有敏感配置从 `.env.local` 读取
- **默认值兜底**：非敏感配置提供合理默认值
- **类型安全**：使用 TypeScript 接口约束配置结构

#### 2.4.2 ai/client.ts - AI 客户端

```typescript
import OpenAI from 'openai';
import { loadConfig } from '@/lib/config';

let client: OpenAI | null = null;

export function getAiClient(): OpenAI {
    if (!client) {
        const config = loadConfig();
        client = new OpenAI({
            baseURL: config.ai.baseUrl,
            apiKey: config.ai.apiKey
        });
    }
    return client;
}

export async function streamChatCompletion(
    messages: ChatMessage[],
    model?: string
): Promise<AsyncIterable<ChatCompletionChunk>> {
    const config = loadConfig();
    const aiClient = getAiClient();
    
    const stream = await aiClient.chat.completions.create({
        model: model || config.ai.defaultModel,
        messages,
        stream: true
    });
    
    return stream;
}
```

**单例模式**：
- 全局共享一个 OpenAI 客户端实例
- 避免重复创建连接，提升性能

#### 2.4.3 ai/embedding.ts - 向量化

```typescript
export async function embedTexts(texts: string[]): Promise<number[][]> {
    const config = loadConfig();
    const aiClient = getAiClient();
    
    const response = await aiClient.embeddings.create({
        model: config.ai.embeddingModel,
        input: texts
    });
    
    return response.data.map(item => item.embedding);
}

export async function splitText(text: string, chunkSize = 500): Promise<string[]> {
    const chunks: string[] = [];
    const sentences = text.split(/(?<=[.!?。！？])\s+/);
    
    let currentChunk = '';
    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > chunkSize) {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = sentence;
        } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
    }
    if (currentChunk) chunks.push(currentChunk);
    
    return chunks;
}
```

**向量化流程**：
- 批量处理：一次调用 API 向量化多个文本
- 文本分块：按句子边界分割，避免截断语义

#### 2.4.4 db/prisma-business.ts - 业务数据库客户端

```typescript
import { PrismaClient } from '@prisma/business-client';
import { loadConfig } from '@/lib/config';

let prisma: PrismaClient | null = null;

export function getBusinessPrisma(): PrismaClient {
    if (!prisma) {
        const config = loadConfig();
        prisma = new PrismaClient({
            datasources: {
                db: {
                    url: config.pgsql.businessUrl
                }
            }
        });
    }
    return prisma;
}
```

**双数据库设计**：
- `prisma-business.ts`：管理业务数据（会话、交换、记忆）
- `prisma-knowledge.ts`：管理知识库数据（文档、分块、向量）
- 分离关注点，便于独立扩展和维护

#### 2.4.5 db/pgvector.ts - PGVector 连接池

```typescript
import { Pool } from 'pg';
import { loadConfig } from '@/lib/config';

let pool: Pool | null = null;

export function getPgVectorPool(): Pool {
    if (!pool) {
        const config = loadConfig();
        pool = new Pool({
            connectionString: config.pgsql.knowledgeUrl,
            max: config.maxPoolSize
        });
    }
    return pool;
}

export async function vectorSearch(
    embedding: number[],
    topK: number = 5
): Promise<any[]> {
    const pool = getPgVectorPool();
    const vector = `[${embedding.join(',')}]`;
    
    const result = await pool.query(
        `SELECT document_id, chunk_id, chunk_text,
                1 - (embedding <=> $1::vector) as similarity
         FROM document_chunk
         WHERE embedding IS NOT NULL
         ORDER BY embedding <=> $1::vector
         LIMIT $2`,
        [vector, topK]
    );
    
    return result.rows;
}
```

**向量搜索原理**：
- 使用 pgvector 扩展的 `<=>` 操作符计算余弦距离
- `1 - distance` 转换为相似度分数
- 按相似度降序排序，返回 top-K 结果

#### 2.4.6 db/minio.ts - MinIO 客户端

```typescript
import { Client } from 'minio';
import { loadConfig } from '@/lib/config';

let minioClient: Client | null = null;

export function getMinioClient(): Client {
    if (!minioClient) {
        const config = loadConfig();
        minioClient = new Client({
            endPoint: config.minio.endPoint,
            port: config.minio.port,
            useSSL: config.minio.useSSL,
            accessKey: config.minio.accessKey,
            secretKey: config.minio.secretKey
        });
    }
    return minioClient;
}
```

**注意事项**：
- MinIO 客户端配置分离 `endPoint` 和 `port`
- 不能将端口包含在 `endPoint` 中，否则会报错

#### 2.4.7 db/elasticsearch.ts - ES 客户端

```typescript
import { Client } from '@elastic/elasticsearch';
import { loadConfig } from '@/lib/config';

let esClient: Client | null = null;

export function getEsClient(): Client {
    if (!esClient) {
        const config = loadConfig();
        esClient = new Client({
            node: config.elasticsearch.node,
            auth: config.elasticsearch.auth
        });
    }
    return esClient;
}
```

### 2.5 类型定义 (`lib/models/`)

#### 2.5.1 chat.ts - 聊天相关类型

```typescript
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatRequestDto {
    conversationId?: string;
    question: string;
    mode?: string;
    selectedDocumentId?: number;
}

export interface ChatCompletionChunk {
    id: string;
    choices: Array<{
        delta: {
            content?: string;
            role?: string;
        };
        finish_reason: string | null;
    }>;
}

export interface ExecutionPlan {
    planId: string;
    steps: ExecutionStep[];
}

export interface ExecutionStep {
    stepId: string;
    type: 'retrieval' | 'reasoning' | 'action';
    description: string;
}
```

#### 2.5.2 enum.ts - 枚举定义

```typescript
export enum ChatSessionStatus {
    IDLE = 0,      // 空闲
    ACTIVE = 1,    // 活跃
    ARCHIVED = 2   // 归档
}

export enum ChatQueryMode {
    OPEN_CHAT = 'OPEN_CHAT',              // 自由对话
    AUTO_DOCUMENT = 'AUTO_DOCUMENT',      // 自动文档查询
    CURRENT_DOCUMENT = 'CURRENT_DOCUMENT' // 指定文档查询
}

export enum ExchangeState {
    STARTED = 0,      // 已开始
    IN_PROGRESS = 1,  // 进行中
    COMPLETED = 2,    // 已完成
    FAILED = 3        // 已失败
}

export enum ExecutionMode {
    RETRIEVAL = 'RETRIEVAL',                    // 检索模式
    REACT_AGENT = 'REACT_AGENT',                // ReAct Agent 模式
    GRAPH_ONLY = 'GRAPH_ONLY',                  // 仅图模式
    GRAPH_THEN_EVIFENCE = 'GRAPH_THEN_EVIFENCE',// 图后证据模式
    CLARIFICATION = 'CLARIFICATION',            // 澄清模式
    RAG_CHAT = 'RAG_CHAT'                       // RAG 模式
}
```

**枚举设计原则**：
- 使用 `const enum` 或普通 `enum`
- 数值枚举便于数据库存储
- 字符串枚举便于调试和日志

#### 2.5.3 admin.ts - 管理员类型

```typescript
export interface AdminLoginRequest {
    username: string;
    password: string;
}

export interface AdminRegisterRequest {
    username: string;
    password: string;
    email?: string;
}
```

---

## 三、外部 API 集成深解

### 3.1 OpenAI API（DashScope 兼容）

**鉴权机制**：
```typescript
// .env.local
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_API_KEY=sk-xxxxxxxxxxxxxxxx

// 代码中使用
const client = new OpenAI({
    baseURL: process.env.AI_BASE_URL,
    apiKey: process.env.AI_API_KEY
});
```

**安全性**：
- API Key 存储在 `.env.local`，不提交到 Git
- 通过环境变量注入，避免硬编码
- 生产环境使用密钥管理服务（如 AWS Secrets Manager）

**请求封装**：
```typescript
export async function streamChatCompletion(
    messages: ChatMessage[],
    model?: string
): Promise<AsyncIterable<ChatCompletionChunk>> {
    const config = loadConfig();
    const aiClient = getAiClient();
    
    // 流式请求
    const stream = await aiClient.chat.completions.create({
        model: model || config.ai.defaultModel,
        messages,
        stream: true,
        temperature: 0.7,  // 控制随机性
        max_tokens: 2000   // 限制输出长度
    });
    
    return stream;
}
```

**重试策略**：
```typescript
async function retryRequest<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (err: any) {
            if (i === maxRetries - 1) throw err;
            if (err.status === 429) {
                // 限流，等待后重试
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            } else if (err.status >= 500) {
                // 服务器错误，重试
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                // 客户端错误，不重试
                throw err;
            }
        }
    }
    throw new Error('Max retries exceeded');
}
```

**异常处理**：
```typescript
try {
    const response = await aiClient.chat.completions.create({...});
} catch (err: any) {
    if (err.status === 401) {
        // 认证失败，API Key 无效
        throw new Error('Invalid API key');
    } else if (err.status === 429) {
        // 限流，请求过于频繁
        throw new Error('Rate limit exceeded');
    } else if (err.status === 400) {
        // 请求参数错误
        throw new Error(`Bad request: ${err.message}`);
    } else if (err.status >= 500) {
        // 服务器错误
        throw new Error('AI service temporarily unavailable');
    } else {
        throw err;
    }
}
```

### 3.2 向量化 API

**批量处理**：
```typescript
export async function embedTexts(texts: string[]): Promise<number[][]> {
    const config = loadConfig();
    const aiClient = getAiClient();
    
    // 批量向量化（一次最多 25 条）
    const batchSize = 25;
    const batches = [];
    for (let i = 0; i < texts.length; i += batchSize) {
        batches.push(texts.slice(i, i + batchSize));
    }
    
    const results = await Promise.all(
        batches.map(async batch => {
            const response = await aiClient.embeddings.create({
                model: config.ai.embeddingModel,
                input: batch
            });
            return response.data.map(item => item.embedding);
        })
    );
    
    return results.flat();
}
```

**错误处理**：
- 空文本：跳过或返回零向量
- 超长文本：截断或分块处理
- API 限流：批量控制 + 重试机制

---

## 四、TypeScript 进阶"八股"结合

### 4.1 `as const` 的应用

**场景**：常量配置
```typescript
// ❌ 错误：类型被推断为 string
const MODES = {
    OPEN_CHAT: 'OPEN_CHAT',
    AUTO_DOCUMENT: 'AUTO_DOCUMENT'
};

// ✅ 正确：类型被推断为字面量类型
const MODES = {
    OPEN_CHAT: 'OPEN_CHAT',
    AUTO_DOCUMENT: 'AUTO_DOCUMENT'
} as const;

// MODES.OPEN_CHAT 的类型是 'OPEN_CHAT'，而非 string
```

**本项目应用**：
```typescript
// lib/models/enum.ts
export const ChatSessionStatus = {
    IDLE: 0,
    ACTIVE: 1,
    ARCHIVED: 2
} as const;

export type ChatSessionStatus = typeof ChatSessionStatus[keyof typeof ChatSessionStatus];
// 类型：0 | 1 | 2
```

### 4.2 `readonly` 与 `Object.freeze()`

**`readonly`（类型层面）**：
```typescript
interface Config {
    readonly apiKey: string;
    readonly baseUrl: string;
}

const config: Config = {
    apiKey: 'sk-xxx',
    baseUrl: 'https://api.openai.com'
};

// ❌ 编译错误：Cannot assign to 'apiKey' because it is a read-only property
config.apiKey = 'new-key';
```

**`Object.freeze()`（运行时）**：
```typescript
const config = Object.freeze({
    apiKey: 'sk-xxx',
    baseUrl: 'https://api.openai.com'
});

// ❌ 运行时错误：Cannot assign to read only property
config.apiKey = 'new-key';
```

**区别**：
- `readonly`：仅类型检查，运行时可修改
- `Object.freeze()`：运行时冻结，无法修改属性

**本项目应用**：
```typescript
// 配置对象使用 readonly 修饰符
export interface AppConfig {
    readonly ai: {
        readonly baseUrl: string;
        readonly apiKey: string;
    };
}
```

### 4.3 泛型（Generic）的应用

**场景**：API 请求封装
```typescript
// 通用请求函数
async function apiRequest<T>(
    url: string,
    options?: RequestInit
): Promise<T> {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json() as Promise<T>;
}

// 使用
interface User {
    id: number;
    name: string;
}

const user = await apiRequest<User>('/api/user/1');
// user 的类型自动推断为 User
```

**本项目应用**：
```typescript
// ConversationManager 中的泛型方法
async getRecentExchanges<T extends boolean = false>(
    conversationId: string,
    limit: number,
    includeAnswer?: T
): Promise<Array<T extends true ? ConversationExchange : Pick<ConversationExchange, 'exchangeId' | 'question'>>> {
    // 实现...
}
```

### 4.4 类型守卫（Type Guard）

**场景**：处理不确定返回值
```typescript
// 自定义类型守卫
function isChatCompletionChunk(value: any): value is ChatCompletionChunk {
    return (
        typeof value === 'object' &&
        'id' in value &&
        'choices' in value &&
        Array.isArray(value.choices)
    );
}

// 使用
const data = await response.json();
if (isChatCompletionChunk(data)) {
    // TypeScript 知道 data 是 ChatCompletionChunk 类型
    console.log(data.choices[0].delta.content);
}
```

**本项目应用**：
```typescript
// 处理 Prisma 查询结果
function isValidSession(session: any): session is ConversationSession {
    return (
        session !== null &&
        typeof session === 'object' &&
        'conversationId' in session &&
        'chatMode' in session
    );
}

const session = await prisma.conversationSession.findUnique({...});
if (isValidSession(session)) {
    // TypeScript 知道 session 是 ConversationSession 类型
    console.log(session.conversationId);
}
```

### 4.5 联合类型与类型收窄

```typescript
type Result<T> = 
    | { success: true; data: T }
    | { success: false; error: string };

function handleResult(result: Result<User>) {
    if (result.success) {
        // TypeScript 知道 result.data 存在
        console.log(result.data.name);
    } else {
        // TypeScript 知道 result.error 存在
        console.error(result.error);
    }
}
```

---

## 五、Next.js 核心"八股"结合

### 5.1 为什么选择 App Router？

**App Router 的优势**：

| 特性 | App Router | Pages Router |
|------|-----------|--------------|
| 文件系统路由 | ✅ 自动 | ✅ 自动 |
| Server Components | ✅ 默认 | ❌ 需手动 |
| 流式响应 | ✅ 原生支持 | ⚠️ 需额外配置 |
| 并行数据获取 | ✅ Promise.all | ⚠️ 需 getServerSideProps |
| 布局系统 | ✅ layout.tsx | ❌ 无 |
| 错误处理 | ✅ error.tsx | ❌ 需自定义 |

**本项目选择 App Router 的原因**：
1. **流式响应**：AI 聊天需要 SSE 流式输出
2. **Server Components**：减少客户端 JavaScript 体积
3. **布局系统**：统一管理页面结构

### 5.2 SSR vs SSG

**本项目全部使用 SSR**：

| 页面类型 | 渲染方式 | 判断依据 |
|---------|---------|---------|
| API 路由 | 服务端 | `route.ts` 文件 |
| 聊天页面 | 客户端 | `'use client'` 指令 |
| 会话列表 | 客户端 | `'use client'` 指令 |

**为什么不用 SSG？**
- 聊天内容动态生成，无法预渲染
- 会话列表实时变化，需要服务端获取
- AI 回答依赖实时 API 调用

**判断依据**：
```typescript
// Server Component（默认）
export default async function Page() {
    const data = await fetchData();  // 服务端执行
    return <div>{data}</div>;
}

// Client Component
'use client';  // 必须放在文件顶部
export default function Page() {
    const [data, setData] = useState();  // 客户端状态
    return <div>{data}</div>;
}
```

### 5.3 中间件使用

**本项目未使用 `middleware.ts`**，权限校验在 API 层实现：

```typescript
// 每个需要认证的 API 手动检查 token
export async function POST(r: NextRequest) {
    const token = r.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const payload = jwtVerify(token, process.env.JWT_SECRET!);
        // 继续处理...
    } catch (err) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
}
```

**建议**：添加 `middleware.ts` 统一处理认证，避免重复代码：

```typescript
// middleware.ts（建议添加）
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
        return NextResponse.next();
    } catch (err) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
}

export const config = {
    matcher: '/api/:path*'  // 匹配所有 API 路由
};
```

### 5.4 缓存机制

**Next.js 缓存影响**：

| 缓存类型 | 影响 | 本项目处理 |
|---------|------|-----------|
| Request Memoization | 相同请求合并 | 未使用 |
| Data Cache | 数据缓存 | 未使用 |
| Full Route Cache | 路由缓存 | 未使用 |
| Router Cache | 客户端缓存 | 未使用 |

**SSE 流式响应**：
```typescript
return new NextResponse(stream, {
    headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',  // 禁用缓存
        'Connection': 'keep-alive'    // 保持连接
    }
});
```

**为什么禁用缓存？**
- SSE 是长连接，需要实时推送数据
- 缓存会阻断数据流，导致客户端无法接收更新

---

## 六、Prisma 数据库设计哲学

### 6.1 字段映射详解

**`@default` 默认值**：

```prisma
status Int @default(1)           // 默认状态为 1（空闲）
createTime DateTime @default(now())  // 创建时间自动填充
```

**作用**：
- 减少手动赋值
- 保证数据一致性
- 数据库层面约束

**`@unique` 唯一约束**：

```prisma
conversationId String @unique @db.Uuid  // UUID 唯一标识
username String @unique                  // 用户名唯一
```

**作用**：
- 防止重复数据
- 加速查询（自动创建索引）
- 业务逻辑约束

**`@updatedAt` 自动更新**：

```prisma
editTime DateTime @updatedAt  // 每次更新自动刷新时间
```

**作用**：
- 自动维护更新时间
- 无需手动赋值
- 数据库触发器实现

**`@map` 字段映射**：

```prisma
userId Int? @map("user_id")  // Prisma: userId → 数据库: user_id
```

**作用**：
- Prisma 使用 camelCase
- 数据库使用 snake_case
- `@map` 实现命名转换

### 6.2 关系设计

**一对一关系**：
```prisma
model ConversationSession {
    userId Int?
    user AdminUser? @relation(fields: [userId], references: [id])
}

model AdminUser {
    sessions ConversationSession[]
}
```

**一对多关系**：
```prisma
model ConversationSession {
    exchanges ConversationExchange[]  // 一个会话有多条交换
}

model ConversationExchange {
    session ConversationSession @relation(fields: [conversationId], references: [conversationId])
}
```

**多对多关系**：
```prisma
// 本项目未使用，示例：
model Post {
    tags Tag[]
}

model Tag {
    posts Post[]
}
```

### 6.3 N+1 问题优化

**问题场景**：查询会话列表时，每条会话都要查询关联的交换记录。

**错误示例（N+1 问题）**：
```typescript
// ❌ 错误：N+1 问题
const sessions = await prisma.conversationSession.findMany();
for (const session of sessions) {
    const exchanges = await prisma.conversationExchange.findMany({
        where: { conversationId: session.conversationId }
    });
}
// 执行了 1 + N 次查询
```

**优化方案**：使用 `include` 预加载

```typescript
// ✅ 正确：使用 include
const sessions = await prisma.conversationSession.findMany({
    include: {
        exchanges: { take: 1 }  // 只取第一条
    }
});
// 只执行 1 次查询（JOIN）
```

**本项目应用**：
```typescript
// ConversationManager.ts
async listSessions(p: { keyword?: string; pageNo: number; pageSize: number }) {
    const rows = await this.prisma.conversationSession.findMany({
        include: {
            _count: { select: { exchanges: true } },  // 统计交换数量
            exchanges: {
                orderBy: { exchangeId: 'asc' },
                take: 1,
                select: { question: true }  // 只取第一条问题
            }
        }
    });
    
    return rows.map(r => ({
        conversationId: r.conversationId,
        title: r.title || r.exchanges[0]?.question || '新对话',
        exchangeCount: r._count.exchanges
    }));
}
```

### 6.4 事务处理

**重置会话需要原子性**：

```typescript
async resetSession(conversationId: string) {
    return await this.prisma.$transaction(async (tx) => {
        // 删除交换记录
        await tx.conversationExchange.deleteMany({ where: { conversationId } });
        // 删除记忆摘要
        await tx.conversationMemorySummary.deleteMany({ where: { conversationId } });
        // 更新会话状态
        await tx.conversationSession.update({
            where: { conversationId },
            data: { status: ChatSessionStatus.IDLE }
        });
    });
}
```

**事务保证**：
- 所有操作成功才提交
- 任一操作失败则回滚
- 保证数据一致性

---

## 七、流程闭环：从文档步骤到代码实现

### 7.1 步骤映射表

| 步骤 | 功能 | 实现文件 | 关键函数 |
|------|------|---------|---------|
| 1 | 配置管理 | `lib/config.ts` | `loadConfig()` |
| 2 | AI 客户端 | `lib/ai/client.ts` | `getAiClient()` |
| 3 | 聊天 API | `app/api/chat/route.ts` | `POST()` |
| 8 | 流式聊天 | `lib/ai/client.ts` | `streamChatCompletion()` |
| 9 | SSE 流式 API | `app/api/chat/route.ts` | `ReadableStream` |
| 12 | 数据库配置 | `lib/config.ts` | `pgsql`, `redis` |
| 13 | Prisma 客户端 | `lib/db/prisma-business.ts` | `getBusinessPrisma()` |
| 16-18 | 会话管理 | `lib/service/chat/ConversationManager.ts` | `createSession()`, `getSession()` |
| 19-20 | 会话 API | `app/api/chat/session/*/route.ts` | `GET()`, `POST()` |
| 26-27 | 保存对话 | `app/api/chat/route.ts` | `createExchange()`, `completeExchange()` |
| 28 | 历史查询 | `app/api/chat/session/exchanges/route.ts` | `getRecentExchanges()` |
| 31-36 | 管理员认证 | `app/api/admin/auth/*/route.ts` | `adminLogin()`, `jwtSign()` |
| 43-48 | 记忆系统 | `lib/service/memory/*.ts` | `assembleContext()`, `compressMemory()` |
| 51-57 | 文档上传 | `lib/service/document/*.ts` | `uploadFile()`, `parseDocument()` |
| 58-59 | 文档 API | `app/api/manage/document/*/route.ts` | `POST()`, `GET()` |
| 62-64 | 向量化 | `lib/ai/embedding.ts` | `embedTexts()`, `splitText()` |
| 65 | PGVector | `lib/db/pgvector.ts` | `vectorSearch()` |
| 66 | ES 客户端 | `lib/db/elasticsearch.ts` | `getEsClient()` |
| 68-69 | 索引构建 | `lib/service/document/vectorGatway.ts` | `vectorizeChunks()` |
| 70 | 索引 API | `app/api/manage/document/index/build/route.ts` | `POST()` |

### 7.2 核心功能链路

**聊天功能链路**：
```
用户输入 → /api/chat → streamChatCompletion() → SSE 流式返回
         ↓
    createExchange() → 保存问答记录
         ↓
    assembleContext() → 组装记忆上下文
         ↓
    compressMemory() → 异步压缩记忆
```

**文档索引链路**：
```
文件上传 → /api/manage/document/upload
         ↓
    uploadFile() → MinIO 存储
         ↓
    parseDocument() → 文本提取
         ↓
    documentRepository.create() → 数据库记录
         ↓
/api/manage/document/index/build
         ↓
    splitText() → 文本分块
         ↓
    embedTexts() → 向量化
         ↓
    vectorizeChunks() → 写入 document_chunk
         ↓
    indexChunksToEs() → 写入 Elasticsearch
```

**记忆压缩链路**：
```
对话轮次达到阈值 → 触发压缩
         ↓
    assembleContext() → 获取记忆摘要 + 近期对话
         ↓
    compressMemory() → 调用 AI 压缩
         ↓
    memoryStore.saveSummary() → 保存压缩结果
         ↓
    后续对话使用压缩后的上下文
```

---

## 八、最佳实践建议

### 8.1 代码组织

1. **单一职责**：每个文件只负责一个功能模块
   - `ConversationManager.ts` 只处理会话逻辑
   - `vectorGatway.ts` 只处理向量化逻辑

2. **依赖注入**：通过函数参数传递依赖，便于测试
   ```typescript
   // ❌ 硬编码依赖
   async function process() {
       const prisma = getBusinessPrisma();
   }
   
   // ✅ 依赖注入
   async function process(prisma: PrismaClient) {
       // 便于测试时传入 mock
   }
   ```

3. **类型安全**：使用 TypeScript 严格模式，避免 `any`
   ```typescript
   // ❌ 使用 any
   function handle(data: any) {}
   
   // ✅ 明确类型
   function handle(data: ChatRequestDto) {}
   ```

### 8.2 性能优化

1. **连接池复用**：Prisma、Redis、PGVector 都使用单例模式
   ```typescript
   let prisma: PrismaClient | null = null;
   export function getBusinessPrisma() {
       if (!prisma) prisma = new PrismaClient();
       return prisma;
   }
   ```

2. **批量操作**：`embedTexts()` 批量向量化，减少 API 调用
   ```typescript
   // ❌ 逐条调用
   for (const text of texts) {
       await embedText(text);
   }
   
   // ✅ 批量调用
   await embedTexts(texts);
   ```

3. **异步处理**：记忆压缩异步执行，不阻塞响应
   ```typescript
   // 异步压缩，不等待结果
   (async () => {
       if (shouldCompress) {
           await compressMemory();
       }
   })();
   ```

### 8.3 错误处理

1. **统一格式**：所有 API 错误返回 `{ error: string }`
   ```typescript
   return NextResponse.json(
       { error: 'Invalid request' },
       { status: 400 }
   );
   ```

2. **降级方案**：AI 调用失败时返回默认响应
   ```typescript
   try {
       const response = await aiClient.chat.completions.create({...});
   } catch (err) {
       // 降级：返回缓存结果或默认响应
       return { content: 'AI service temporarily unavailable' };
   }
   ```

3. **日志记录**：关键操作记录日志，便于排查问题
   ```typescript
   console.error('[Chat API] Error:', err);
   ```

### 8.4 安全建议

1. **环境变量**：敏感信息不硬编码，使用 `.env.local`
   ```bash
   # .env.local
   AI_API_KEY=sk-xxx
   JWT_SECRET=xxx
   ```

2. **JWT 认证**：API 接口统一使用 Bearer Token
   ```typescript
   const token = r.headers.get('authorization')?.replace('Bearer ', '');
   ```

3. **输入校验**：所有用户输入进行校验，防止注入攻击
   ```typescript
   // 使用 Zod 校验
   const schema = z.object({
       question: z.string().min(1).max(1000)
   });
   const validated = schema.parse(body);
   ```

---

## 九、已知项目潜在优化点

### 9.1 架构层面

1. **缺少中间件**：认证逻辑重复，建议添加 `middleware.ts`
   - 当前：每个 API 手动校验 token
   - 优化：统一中间件处理

2. **缺少缓存层**：Redis 仅用于会话缓存，未充分利用
   - 优化：缓存热门文档、向量化结果

3. **缺少消息队列**：文档索引同步执行，大量文档时可能阻塞
   - 优化：使用 Bull/BullMQ 异步处理

### 9.2 代码层面

1. **SSE 格式不统一**：前端解析逻辑不一致
   - 当前：部分使用 `data: ` 前缀，部分未使用
   - 优化：统一 SSE 格式

2. **BigInt 序列化**：需要手动转换，容易遗漏
   - 当前：`fileSize: Number(doc.fileSize)`
   - 优化：自定义 Prisma 序列化器

3. **错误处理不完善**：部分 API 缺少 try-catch
   - 优化：统一错误处理中间件

### 9.3 性能层面

1. **N+1 查询**：部分场景未使用 `include` 预加载
   - 优化：审查所有查询，使用 `include` 或 `select`

2. **缺少分页**：文档列表默认返回所有记录
   - 优化：强制分页，避免大数据量查询

3. **缺少索引**：数据库查询字段未添加索引
   - 优化：为常用查询字段添加索引
   ```prisma
   model SuperAgentDocument {
       documentName String @index  // 添加索引
   }
   ```

### 9.4 功能层面

1. **缺少 RAG 检索**：步骤 71-77 未实现
   - 优化：实现向量检索 + 关键词检索混合

2. **缺少查询改写**：步骤 78-84 未实现
   - 优化：使用 AI 改写用户查询，提升检索效果

3. **缺少 Agent 模式**：步骤 85-93 未实现
   - 优化：实现 ReAct Agent，支持工具调用

---

## 十、总结

本项目完整实现了 `next-ai-渐进式实现指南` 前 70 步的所有功能，包括：

- ✅ 基础对话（步骤 1-11）
- ✅ 会话管理（步骤 12-25）
- ✅ 聊天历史（步骤 26-30）
- ✅ 管理员认证（步骤 31-42）
- ✅ 记忆系统（步骤 43-50）
- ✅ 文档上传与解析（步骤 51-61）
- ✅ 向量化与索引构建（步骤 62-70）

项目架构清晰，代码规范，适合作为学习 Next.js + AI 应用开发的实战案例。后续可继续实现 RAG 检索、查询改写、Agent 模式等高级功能。

---

**文档生成时间**：2026-07-17  
**项目版本**：next-ai v1.0  
**教程版本**：next-ai-渐进式实现指南 前 70 步