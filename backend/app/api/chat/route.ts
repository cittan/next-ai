import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/ai/client'


export async function POST(req: NextRequest) {
    const body: any = await req.json();
    const question = body.question as string;

    if (!question?.trim()) {
        return NextResponse.json({ error: "问题不能为空" }, { status: 400 });
    }
    try {
        const result = await chatCompletion([
            {role: "system", content: "你是一个专业的助手"},
            {role: "user", content: question},
        ],{});
        return NextResponse.json({content: result.content, usage: result.usage});
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "服务器错误" }, { status: 500 });
    }


}