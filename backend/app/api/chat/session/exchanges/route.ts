import { conversationManager } from "@/lib/service/chat/ConversationManager";
import { NextRequest, NextResponse } from "next/server";

// 获取最近的对话记录
export async function GET(r: NextRequest) {
    const cid = r.nextUrl.searchParams.get("conversationId");
    if(!cid) {
        return NextResponse.json('ConversationId is required.',{status: 400});
    }
    const limit = parseInt(r.nextUrl.searchParams.get("limit") || '50');
    try {
        const exchanges = await conversationManager.getRecentExchanges(cid, limit);
        return NextResponse.json({conversationId: cid,exchanges},{status: 200});
    } catch (error: any) {
        return NextResponse.json({error: error.message},{status: 500});
    }

}