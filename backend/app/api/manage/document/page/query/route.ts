import { documentRepository } from "@/lib/service/document/documentRepository";
import { NextRequest, NextResponse } from "next/server";

export async function GET(r: NextRequest) {
    const k = r.nextUrl.searchParams.get('keyword');
    const pageNo = parseInt(r.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(r.nextUrl.searchParams.get('pageSize') || '10');
    if (!k || !pageNo || !pageSize) {
        return NextResponse.json({ error: '参数错误' }, { status: 400 });
    }
    try {
        const docs = await documentRepository.list({
            keyword: k,
            pageNo,
            pageSize,
        });
        // 转换 fileSize 为 Number 类型，避免 JSON 序列化时出错
        const documents = docs.rows.map(doc => ({
            ...doc,
            fileSize: doc.fileSize ? Number(doc.fileSize) : null
        }));
        return NextResponse.json({ pageNo, pageSize, total: docs.total, documents });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    } 
}