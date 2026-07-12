import { NextRequest, NextResponse } from 'next/server';
import { streamChatCompletion, ChatMessage } from '@/lib/ai/client'
import { ChatRequestDto } from '@/lib/models/chat';
import { conversationManager } from '@/lib/service/chat/ConversationManager';
import { ExchangeState } from '@/lib/models/enum';
import { assembleContext, shouldCompress } from '@/lib/service/memory/contextAssembler';
import { memoryStore } from '@/lib/service/memory/memoryStore';
import { compressMemory } from '@/lib/service/memory/memorySummrizer';

export async function POST(req: NextRequest): Promise<NextResponse> {
    const body = await req.json() as ChatRequestDto;
    if (!body.question?.trim()) {
        return NextResponse.json({ error: "问题不能为空" }, { status: 400 });
    }
    const messages: ChatMessage[] = [
        { role: "system", content: "你是typescript专业助手" },
        { role: "user", content: body.question },
    ]


    const conversationId = (body.conversationId as string) || crypto.randomUUID();

    // 组装记忆上下文：从数据库获取长期摘要和近期对话记录
    const context = await assembleContext(conversationId, memoryStore);

    // system prompt 包含长期记忆：将压缩后的对话摘要注入到系统提示词中
    const systemPrompt = `你是Super Agent智能助手。${context.longTermSummary ? `\n对话历史摘要: ${context.longTermSummary}` : ''}`;

    // 用户消息包含近期对话：将最近几轮的对话记录附在用户问题前面，帮助 AI 理解上下文
    const userContent = context.recentTranscript ? `近期对话:\n${context.recentTranscript}\n\n当前问题: ${body.question}` : body.question;

    //获得会话信息
    let session = await conversationManager.getSession(conversationId);
    if (!session) {
        await conversationManager.createSession({ conversationId, chatMode: 'OPEN_CHAT' });
    }
    const exchangeId = await conversationManager.getLatestExchangeId(conversationId) + 1;
    await conversationManager.createExchange({ conversationId, exchangeId, question: body.question });
    const startTime = Date.now();
    let fullAnswer = '';
    let firstTokenTime: number | null = null

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            try {
                for await (const chunk of streamChatCompletion(messages, { model: 'qwen-turbo', maxTokens: 256, temperature: 0.3 })) {
                    if (chunk.content) {
                        fullAnswer += chunk.content;
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", content: chunk.content })}\n\n`));
                        // 延迟 30ms 确保每个 token 作为独立网络包发送，浏览器端 reader.read() 才能逐次返回
                        await new Promise(r => setTimeout(r, 30));
                    }
                    if (chunk.finishReason === 'stop') {
                        // 异步记忆压缩：每轮对话结束后检查是否需要压缩，不阻塞当前响应
                        try {
                            const recent = await memoryStore.getRecentExchanges(conversationId, 10);
                            const latest = await memoryStore.getLatestSummary(conversationId);
                            // 判断是否需要触发压缩：自上次压缩后新增超过 10 轮对话
                            if (recent && shouldCompress(latest, recent)) {
                                // 取最近的 10 轮对话与现有摘要合并压缩
                                const r = await compressMemory({ existingSummary: latest, newExchanges: recent.slice(-10).map(e => ({ exchangeId: e.exchangeId, question: e.question, answer: e.answer || '' })) || [] });
                                // 将压缩结果持久化到数据库，供后续对话使用
                                await memoryStore.saveSummary({ conversationId, ...r });
                            }
                        } catch (e) { console.error('[Memory] compress error:', e); }
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`))
                        await conversationManager.completeExchange({ conversationId, exchangeId, answer: fullAnswer, exchangeState: ExchangeState.COMPLETED, firstTokenLatencyMs: firstTokenTime ? firstTokenTime - startTime : undefined, totalLatencyMs: Date.now() - startTime });
                        if (exchangeId === 1) {
                            await conversationManager.renameSession({ conversationId, title: body.question.slice(0, 50) });
                        }
                        await conversationManager.setSessionIdle({ conversationId });
                    }
                }
            } catch (error: any) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`));
                await conversationManager.completeExchange({ conversationId, exchangeId, answer: fullAnswer, exchangeState: ExchangeState.FAILED, firstTokenLatencyMs: firstTokenTime ? firstTokenTime - startTime : undefined, totalLatencyMs: Date.now() - startTime }).catch(() => { });
                await conversationManager.setSessionIdle({ conversationId }).catch(() => { });
            } finally {
                //关闭流
                controller.close();
            }
        }
    });
    //返回内容自动包装为Promise
    return new NextResponse(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
}