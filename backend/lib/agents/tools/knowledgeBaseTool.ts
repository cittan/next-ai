import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { retrieve } from '@/lib/rag/channels/retirevalEngine';

/**
 * 健身知识库检索工具
 * 对接现有 RAG 系统，检索健身、营养、训练相关的专业知识
 */

export const knowledgeBaseTool = tool(
    async ({ query }) => {
        try {
            const { results, evidenceText } = await retrieve(query);

            if (results.length === 0) {
                return '知识库中未找到相关信息。请尝试用更通用的关键词搜索，如"减脂"、"增肌"、"蛋白质"、"训练计划"等。';
            }

            const formatted = results
                .slice(0, 5)
                .map((r, i) => {
                    const source = r.documentTitle || `文档${r.documentId}`;
                    return [
                        `[${i + 1}] 来源: ${source}`,
                        `相关度: ${(r.score * 100).toFixed(1)}%`,
                        `内容: ${r.content.slice(0, 500)}`,
                    ].join('\n');
                })
                .join('\n\n---\n\n');

            return `📚 知识库检索结果（共 ${results.length} 条匹配）：\n\n${formatted}`;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return `知识库检索失败: ${message}`;
        }
    },
    {
        name: 'fitness_knowledge_base',
        description:
            '检索健身、营养、训练相关的专业知识库。包含训练原理、营养学知识、运动科学、常见问答等内容。' +
            '当用户询问健身原理、营养学问题、训练方法、常见误区等专业知识时使用。' +
            '例如："蛋白质什么时候吃最好"、"减脂期如何保持肌肉"、"新手如何开始力量训练"。',
        schema: z.object({
            query: z.string().describe('检索关键词或问题，如"减脂原理"、"蛋白质摄入时机"、"力量训练新手指南"'),
        }),
    },
);
