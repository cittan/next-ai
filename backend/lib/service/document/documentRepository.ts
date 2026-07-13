import { getKnowledgePrisma } from "@/lib/db/prisma-knowledge";



export const documentRepository = {
    // 创建文档
    async create(p: {
        documentName: string; fileType: number; fileSize: number;
        storageObjectName: string; parsedTextObjectName?: string; knowledgeScopeCode?: string;
        knowledgeScopeName?: string; businessCategory?: string; documentTags?: string;
    }) {
        return getKnowledgePrisma().superAgentDocument.create({
            data: {
                ...p,
                parseStatus: p.parsedTextObjectName ? 2 : 1,  // 有解析文本则标记为解析完成
                indexStatus: 0,    // 待索引
                strategyStatus: 0  // 待规划
            }
        })
    },

    //查询文档
    async findById(documentId: number) {
        return getKnowledgePrisma().superAgentDocument.findUnique({
            where: {
                id: documentId
            }
        })
    },

    //分页查询文档
    async list(p: { keyword?: string, pageNo: number, pageSize: number }) {
        const where: any = {};
        if (p.keyword) {
            where.documentName = {
                contains: p.keyword
            }
        };
        const [total, rows] = await Promise.all([
            getKnowledgePrisma().superAgentDocument.count({
                where: where
            }),
            getKnowledgePrisma().superAgentDocument.findMany({
                where: where,
                orderBy: {
                    createTime: "desc"
                },
                skip: (p.pageNo - 1) * p.pageSize,
                take: p.pageSize
            }),
        ]);
        return {
            total,
            rows
        }
    },

    //删除文档
    async delete(documentId: number) {
        await getKnowledgePrisma().superAgentDocument.delete({
            where: {
                id: documentId
            }
        })
    },

}