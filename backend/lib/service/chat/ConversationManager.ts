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
        return { conversationId: row.conversationId, chatMode: row.chatMode, status: row.status as ChatSessionStatus, title: row.title ||
            row.exchanges[0]?.question || '新对话', userId: row.userId ?? undefined, exchangeCount: row._count.exchanges, createTime: row.createTime, editTime: row.editTime            
        }
    }

    
}