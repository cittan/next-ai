import { NextRequest, NextResponse } from 'next/server';
import { streamChatCompletion, ChatMessage } from '@/lib/ai/client'


export async function POST(req: NextRequest): Promise<NextResponse> {
    const { question } = await req.json() as { question?: string };
    if (!question?.trim()) {
        return NextResponse.json({ error: "问题不能为空" }, { status: 400 });
    }
    const messages: ChatMessage[] = [
        { role: "system", content: "你是一个专业的助手" },
        { role: "user", content: question },
    ]

    // 编码器，用于将字符串转换为字节流，不能用于I/O
    const encoder = new TextEncoder();
    //生产者/消费者模式
    //启动readablestream，立刻使用controller向ReadableStream的缓冲队列推encode编码的数据，最后NextResponse的接受队列中的内容
    const stream = new ReadableStream({
        //ReadableStream被new时自动执行start方法，controller是控制器
        async start(controller) {
            try {
                for await (const chunk of streamChatCompletion(messages)) {
                    if (chunk.content) {
                        //推数据，内部是队列，en queue
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", content: chunk.content })}\n\n`));
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