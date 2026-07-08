import { conversationManager } from "@/lib/service/chat/ConversationManager";
import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest){
    //也可以使用ts内置的URL类来解析url参数，
    const page = parseInt(request.nextUrl.searchParams.get("page") || '1');
    const pSize = parseInt(request.nextUrl.searchParams.get("pageSize") || '10');
    const keyword = request.nextUrl.searchParams.get("keyword") || undefined;
    try{
        const d = await conversationManager.listSessions({ keyword: keyword, pageNo: page, pageSize: pSize });
        return NextResponse.json({pageNo: page,pageSize: pSize, totalSize: d.total, totalPages: Math.ceil(d.total / pSize),sessions: d.sessions});
    } catch (e: any) {
        return NextResponse.json({error: e.message},{status: 500});
    }

}