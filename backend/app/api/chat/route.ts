import { NextRequest, NextResponse } from 'next/server';
import { streamChatCompletion, ChatMessage } from '@/lib/ai/client'


export async function POST(req: NextRequest): Promise<NextResponse> {
    const { question } = await req.json() as { question?: string };
    if (!question?.trim()) {
        return NextResponse.json({ error: "问题不能为空" }, { status: 400 });
    }
    const messages: ChatMessage[] = [
        { role: "system", content: "你是typescript专业助手" },
        { role: "user", content: question },
    ]

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            try {
                for await (const chunk of streamChatCompletion(messages, { model: 'qwen-turbo', maxTokens: 256, temperature: 0.3 })) {
                    if (chunk.content) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", content: chunk.content })}\n\n`));
                        // 延迟 30ms 确保每个 token 作为独立网络包发送，浏览器端 reader.read() 才能逐次返回
                        await new Promise(r => setTimeout(r, 30));
                    }
                    if (chunk.finishReason === 'stop') {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`))
                    }
                }
            } catch (error: any){
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`))
            } finally {
                //关闭流
                controller.close();
            }
        }
    });
    //返回内容自动包装为Promise
    return new NextResponse(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
}