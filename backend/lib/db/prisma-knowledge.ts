import { PrismaClient } from '.prisma-knowledge';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// 通过 globalThis 存储 Prisma 实例，避免 Next.js 热重载时重复创建客户端
const g = globalThis as any;

function createPrisma(): PrismaClient {
  const pool = new Pool({ connectionString: process.env.KNOWLEDGE_DB_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export function getKnowledgePrisma(): PrismaClient {
  // 单例模式：首次调用时创建，后续直接复用
  if (!g._prismaKnowledge) g._prismaKnowledge = createPrisma();
  return g._prismaKnowledge;
}