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
            stableFacts: Array.isArray(row.stableFacts) ? row.stableFacts : [],
            pendingQuestions: Array.isArray(row.pendingQuestions) ? row.pendingQuestions : [],
            retrievalHints: Array.isArray(row.retrievalHints) ? row.retrievalHints : [],
            resolvedPoints: Array.isArray(row.resolvedPoints) ? row.resolvedPoints : [],
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
                stableFacts: p.stableFacts,
                pendingQuestions: p.pendingQuestions,
                retrievalHints: p.retrievalHints,
                resolvedPoints: p.resolvedPoints,
                userPreferences: undefined,
            },
        })
    }

    async getRecentExchanges(conversationId: string, limit: number = 10){
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