import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/middleware/auth';
import { getKnowledgePrisma } from '@/lib/db/prisma-knowledge';

// GET — 获取知识主题列表（可按 scopeCode 过滤）
export async function GET(request: NextRequest) {
  const auth = authenticateAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const scopeCode = new URL(request.url).searchParams.get('scopeCode');

  const prisma = getKnowledgePrisma();
  const rows = await prisma.knowledgeTopic.findMany({
    where: scopeCode ? { scopeCode } : undefined,
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json(rows.map(r => ({
    id: String(r.id),
    topicCode: r.topicCode,
    topicName: r.topicName,
    scopeCode: r.scopeCode || '',
    description: r.description || '',
    aliases: r.aliases || '',
    examples: r.examples || '',
    answerShape: r.answerShape || '',
    executionPreference: r.executionPreference || '',
    sortOrder: String(r.sortOrder || 0),
    isActive: String(r.isActive),
  })));
}

// POST — 创建或更新知识主题（upsert）
export async function POST(request: NextRequest) {
  const auth = authenticateAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json() as Record<string, string | undefined>;
  const { topicCode, topicName, scopeCode, description, aliases, examples, answerShape, executionPreference, sortOrder, isActive } = body;

  if (!topicCode) {
    return NextResponse.json({ error: '缺少 topicCode' }, { status: 400 });
  }

  const sort = sortOrder !== undefined ? Number(sortOrder) : 0;
  const active = isActive !== undefined ? String(isActive) === 'true' : undefined;

  const prisma = getKnowledgePrisma();
  await prisma.knowledgeTopic.upsert({
    where: { topicCode },
    update: { topicName, scopeCode, description, aliases, examples, answerShape, executionPreference, sortOrder: Number.isNaN(sort) ? undefined : sort, isActive: active },
    create: { topicCode, topicName: topicName || '', scopeCode: scopeCode || '', description, aliases, examples, answerShape, executionPreference, sortOrder: Number.isNaN(sort) ? 0 : sort, isActive: active ?? true },
  });

  return NextResponse.json({ success: true });
}

// DELETE — 删除知识主题
export async function DELETE(request: NextRequest) {
  const auth = authenticateAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { topicCode } = await request.json() as { topicCode?: string };
  if (!topicCode) {
    return NextResponse.json({ error: '缺少 topicCode' }, { status: 400 });
  }

  const prisma = getKnowledgePrisma();
  await prisma.knowledgeTopic.delete({ where: { topicCode } });
  return NextResponse.json({ success: true });
}
