import { documentRepository } from "@/lib/service/document/documentRepository";
import { detectFormat, parseDocument, FileTypeMap } from "@/lib/service/document/parserService";
import { uploadFile } from "@/lib/service/document/storageService";
import { NextRequest, NextResponse } from "next/server";


export async function POST(r: NextRequest) {
    try {
        const fd = await r.formData();
        const file = fd.get('file') as File || null;
        if (!file) {
            return NextResponse.json({ error: '请选择文件' }, { status: 400 });
        }
        const buf = Buffer.from(await file.arrayBuffer());
        const format = detectFormat(file.name);
        const objectName = await uploadFile(buf, file.name, file.type);
        let parsedName: string | undefined;
        try {
            const text = await parseDocument(buf, format);
            const textBuf = Buffer.from(text);
            parsedName = await uploadFile(textBuf, `${file.name}.txt`, 'text/plain');
        } catch (e: any) {
            console.error('Parse error:', e);
        }
        const doc = await documentRepository.create({
            documentName: file.name,
            fileType: FileTypeMap[format],
            fileSize: file.size,
            objectName: objectName,
            parseTextPath: parsedName,
        });
        return NextResponse.json({ success: true, documentId: doc.id });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}