import { getBusinessPrisma } from "@/lib/db/prisma-business";

export class MemoryStore {
    private get prisma() {
        return getBusinessPrisma();
    }
    async getLatestSummary(conversationId: string) {
        const row = await this.prisma.conversationMemorySummary.findFirst({
            where: {
                conversationId,
            },
            orderBy: {
                coveredExchangeId: "desc",
            }
        });

        if (!row) {
            return null;
        }

        return {
            conversationId: row.conversationId,
            coveredExchangeId: row.coveredExchangeId,
            compressionCount: row.compressionCount,
            conversationGoal: row.conversationGoal ?? undefined,
            summary: row.summary,
            stableFacts: JSON.parse((row.stableFacts as string) || '[]'),
            pendingQuestions: JSON.parse((row.pendingQuestions as string) || '[]'),
            retrievalHints: JSON.parse((row.retrievalHints as string) || '[]'),
            resolvedPoints: JSON.parse((row.resolvedPoints as string) || '[]'),
            tokenUsed: row.tokenUsed ?? 0,
        }
    }

    async saveSummary(p: {
        conversationId: string, coveredExchangeId: number, compressionCount: number,
        conversationGoal?: string, summary: string, stableFacts: string[], pendingQuestions: string[],
        retrievalHints: string[], resolvedPoints: string[], tokenUsed: number
    }) {
        await this.prisma.conversationMemorySummary.create({
            data: {
                ...p,
                stableFacts: JSON.stringify(p.stableFacts),
                pendingQuestions: JSON.stringify(p.pendingQuestions),
                retrievalHints: JSON.stringify(p.retrievalHints),
                resolvedPoints: JSON.stringify(p.resolvedPoints),
                userPreferences: undefined,
            },
        })
    }

    async getRecentExchanges(conversationId: string, limit: 10){
        const rows = await this.prisma.conversationExchange.findMany({
            where: {
                conversationId,
            },
            orderBy: {
                exchangeId: "desc",
            },
            take: limit,
            select: {
                exchangeId: true,
                question: true,
                answer: true,
            }
        })
        if (!rows) {
            return null;
        }
        return rows.reverse();
    }
}

export const memoryStore = new MemoryStore();