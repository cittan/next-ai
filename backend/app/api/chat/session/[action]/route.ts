import { conversationManager } from "@/lib/service/chat/ConversationManager";
import { NextRequest, NextResponse } from "next/server";

//next15使用动态路由接收参数必须用promise包裹
export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
    const { action } = await params;
    const cid = request.nextUrl.searchParams.get("conversationId");
    if (!cid) {
        return NextResponse.json({ error: "conversationId is required" }, { status: 400 })
    }
    try {
        switch (action) {
            case 'rename':{
                    const t = request.nextUrl.searchParams.get("title");
                    if (!t) {
                        return NextResponse.json({ error: "title is required" }, { status: 400 })
                    };
                    await conversationManager.renameSession({ conversationId: cid, title: t });
                    return NextResponse.json({ ok: true });
                }
            case 'delete':{
                    await conversationManager.deleteSession({ conversationId: cid });
                    return NextResponse.json({ ok: true });
                }
            case 'reset':{
                const n = await conversationManager.resetSession({ conversationId: cid });
                return NextResponse.json({ ok: true });
            }
            default:
                return NextResponse.json({ error: `"${action}" action is not supported` }, { status: 400 })
        }
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}