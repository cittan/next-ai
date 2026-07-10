import { NextRequest, NextResponse } from 'next/server';
import { streamChatCompletion, ChatMessage } from '@/lib/ai/client'
import { ChatRequestDto } from '@/lib/models/chat';
import { conversationManager } from '@/lib/service/chat/ConversationManager';
import { ExchangeState } from '@/lib/models/enum';

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
    //获得会话信息
    let session = await conversationManager.getSession(conversationId);
    if(!session) {
        await conversationManager.createSession({ conversationId, chatMode: 'OPEN_CHAT' });
    }
    const exchangeId = await conversationManager.getLatestExchangeId(conversationId) + 1; 
    await conversationManager.createExchange({ conversationId, exchangeId, question: body.question});
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
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`))
                        await conversationManager.completeExchange({ conversationId, exchangeId, answer: fullAnswer,exchangeState: ExchangeState.COMPLETED, firstTokenLatencyMs: firstTokenTime ? firstTokenTime - startTime : undefined, totalLatencyMs: Date.now() - startTime });
                        if(exchangeId === 1){
                            await conversationManager.renameSession({ conversationId, title: body.question.slice(0,50) });
                        }
                        await conversationManager.setSessionIdle({ conversationId });
                    }
                }
            } catch (error: any){
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`));
                await conversationManager.completeExchange({ conversationId, exchangeId, answer: fullAnswer,exchangeState: ExchangeState.FAILED, firstTokenLatencyMs: firstTokenTime ? firstTokenTime - startTime : undefined, totalLatencyMs: Date.now() - startTime }).catch(() => {});
                await conversationManager.setSessionIdle({ conversationId }).catch(() => {});
            } finally {
                //关闭流
                controller.close();
            }
        }
    });
    //返回内容自动包装为Promise
    return new NextResponse(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
}