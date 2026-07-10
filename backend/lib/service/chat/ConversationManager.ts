import { getBusinessPrisma } from '@/lib/db/prisma-business';
import { ChatSessionStatus } from '@/lib/models/enum';

export class ConversationManager {
    //调用prisma需要this.prisma()方法，相当于获取prisma的客户端实例
    private get prisma() {
        return getBusinessPrisma();
    }

    //创建会话,conversationId(UUID),chatMode(聊天模式),userId(可选)
    async createSession(p: { conversationId: string; chatMode: string; userId?: number }) {
        await this.prisma.conversationSession.create({
            data: {
                conversationId: p.conversationId, chatMode: p.chatMode,
                status: ChatSessionStatus.IDLE, userId: p.userId ?? null
            }
        });
    }

    //获取会话详情
    async getSession(conversationId: string) {
        //字段必须要unique进行修饰，否则会报错，因为prisma会根据conversationId进行查询
        const row = await this.prisma.conversationSession.findUnique({
            //include: {exchanges: true} 表示查询关联的exchanges表，true代表值查询exchange，下面的question同理
            where: { conversationId }, include: {
                _count: { select: { exchanges: true } },
                exchanges: { orderBy: { exchangeId: 'asc' }, take: 1, select: { question: true } }
            }
        });
        if (!row) {
            return null;
        }
        return {
            conversationId: row.conversationId, chatMode: row.chatMode, status: row.status as ChatSessionStatus, title: row.title ||
                row.exchanges[0]?.question || '新对话', userId: row.userId ?? undefined, exchangeCount: row._count.exchanges, createTime: row.createTime, editTime: row.editTime
        }
    }

    //分页按关键词查询
    async listSessions(p: { keyword?: string; pageNo: number; pageSize: number }) {
        const where: any = {};
        if (p.keyword) {
            where.title = { contains: p.keyword };
        }
        const [total, rows] = await Promise.all([
            this.prisma.conversationSession.count({ where }),
            this.prisma.conversationSession.findMany({
                where, orderBy: { editTime: 'desc' }, skip: (p.pageNo - 1) * p.pageSize,
                take: p.pageSize, include: { _count: { select: { exchanges: true } }, exchanges: { orderBy: { exchangeId: 'asc' }, take: 1, select: { question: true } } }
            })
        ]);
        return {
            sessions: rows.map(r => ({
                conversationId: r.conversationId, chatMode: r.chatMode, status: r.status as ChatSessionStatus,
                title: r.title || r.exchanges[0]?.question || '新对话', exchangeCount: r._count.exchanges, createTime: r.createTime, editTime: r.editTime
            })), total
        }
    }

    //重命名会话
    async renameSession(p: { conversationId: string, title: string }) {
        await this.prisma.conversationSession.update({
            where: { conversationId: p.conversationId },
            data: { title: p.title }
        })
    }

    //删除会话
    async deleteSession(p: { conversationId: string }) {
        await this.prisma.conversationSession.delete({
            where: { conversationId: p.conversationId },
        })
    }

    //充值会话
    async resetSession(p: { conversationId: string }) {
        const r = await this.prisma.conversationExchange.deleteMany({
            where: { conversationId: p.conversationId },
        });
        await this.prisma.conversationMemorySummary.deleteMany({
            where: { conversationId: p.conversationId },
        });
        await this.prisma.conversationSession.update({
            where: { conversationId: p.conversationId },
            data: { status: ChatSessionStatus.IDLE }
        })
        return r.count;
    }

    //设置会话状态空闲
    async setSessionIdle(p: { conversationId: string }) {
        await this.prisma.conversationSession.update({
            where: { conversationId: p.conversationId },
            data: { status: ChatSessionStatus.IDLE }
        })
    }

    //设置会话状态活跃
    async setSessionActive(p: { conversationId: string }) {
        await this.prisma.conversationSession.update({
            where: { conversationId: p.conversationId },
            data: { status: ChatSessionStatus.ACTIVE }
        })
    }

    /**
     * 设置Exchange相关的方法
     */
    //创建Exchange
    async createExchange(p: { conversationId: string, exchangeId: number; question: string }) {
        await this.prisma.conversationExchange.create({
            data: { conversationId: p.conversationId, exchangeId: p.exchangeId, question: p.question, answer: '', mode: 'OPEN_CHAT', exchangeState: 1 },
        })
    }

    //完成对话
    async completeExchange(p: {conversationId: string, exchangeId: number, answer: string, exchangeState: number, firstTokenLatencyMs?: number, totalLatencyMs?: number, finishNote?: string }){
        await this.prisma.conversationExchange.updateMany({
            where: { conversationId: p.conversationId, exchangeId: p.exchangeId},
            data: {answer: p.answer, exchangeState: p.exchangeState, finishNote: p.finishNote ?? null, firstTokenLatencyMs: p.firstTokenLatencyMs ?? null, totalLatencyMs: p.totalLatencyMs ?? null}
        })
    }

    //获取最新ExchangeId，用于创建新的ExchangeId
    async getLatestExchangeId(conversationId: string){
        const row = await this.prisma.conversationExchange.aggregate({
            where: {conversationId},
            _max: {exchangeId: true}
        })
        return row._max?.exchangeId ?? 0;
    }

    async getRecentExchanges(conversationId: string, limit=50) {
        const rows = await this.prisma.conversationExchange.findMany({
            where: {conversationId}, orderBy: {exchangeId: 'asc'}, take: limit, select: {exchangeId: true, question: true, answer: true,
                exchangeState: true, createTime: true
            }
        });
        return rows.map(r => ({
            exchangeId: r.exchangeId,
            question: r.question,
            answer: r.answer ?? '',
            exchangeState: r.exchangeState,
            createTime: r.createTime
        }))
    }
}

export const conversationManager = new ConversationManager();