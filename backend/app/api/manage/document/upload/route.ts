import { documentRepository } from "@/lib/service/document/documentRepository";
import { detectFormat, FileTypeMap } from "@/lib/service/document/parserService";
import { uploadFile } from "@/lib/service/document/storageService";
import { producerService } from "@/lib/services/document/ProducerService";
import { getKnowledgePrisma } from "@/lib/db/prisma-knowledge";
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
        
        const doc = await documentRepository.create({
            documentName: file.name,
            fileType: FileTypeMap[format],
            fileSize: file.size,
            objectName: objectName,
        });
        
        // 更新文档状态为解析中
        await getKnowledgePrisma().superAgentDocument.update({
            where: { id: doc.id },
            data: {
                parseStatus: 2, // 解析中
                strategyStatus: 1, // 待策略
                indexStatus: 1, // 待构建
            },
        });
        
        // 创建解析任务
        const prisma = getKnowledgePrisma();
        const task = await prisma.documentTask.create({
            data: {
                documentId: doc.id,
                planId: 0,
                taskType: 1, // 解析任务
                taskStatus: 0, // 待处理
                currentStage: 0,
                triggerSource: 1, // 上传触发
                extJson: '{}',
            },
        });
        
        // 发送 Kafka 消息触发异步解析
        try {
            await producerService.sendParseRoute(doc.id, task.id, objectName);
        } catch (kafkaErr: any) {
            console.error(`[文档上传] Kafka 消息发送失败 doc=${doc.id}:`, kafkaErr.message);
            // 回滚：删除文档和任务
            await prisma.documentTask.delete({ where: { id: task.id } });
            await documentRepository.delete(doc.id);
            return NextResponse.json(
                { error: '消息队列不可用，文档上传失败，请稍后重试' },
                { status: 503 },
            );
        }
        
        return NextResponse.json({ 
            success: true, 
            documentId: doc.id,
            taskId: task.id,
            documentName: doc.documentName,
            parseStatus: 2,
            strategyStatus: 1,
            indexStatus: 1,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}