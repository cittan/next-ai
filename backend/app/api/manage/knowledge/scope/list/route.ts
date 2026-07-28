import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/middleware/auth';
import { getKnowledgePrisma } from '@/lib/db/prisma-knowledge';

// GET — 获取所有知识范围
export async function GET(request: NextRequest) {
  const auth = authenticateAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const prisma = getKnowledgePrisma();
  const rows = await prisma.knowledgeScope.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json(rows.map(r => ({
    id: String(r.id),
    scopeCode: r.scopeCode,
    scopeName: r.scopeName,
    parentScopeCode: r.parentScopeCode || '',
    description: r.description || '',
    aliases: r.aliases || '',
    examples: r.examples || '',
    sortOrder: String(r.sortOrder || 0),
    isActive: String(r.isActive),
  })));
}

// POST — 创建或更新知识范围（upsert）
export async function POST(request: NextRequest) {
  const auth = authenticateAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json() as Record<string, string | undefined>;
  const { scopeCode, scopeName, parentScopeCode, description, aliases, examples, sortOrder, isActive } = body;

  if (!scopeCode) {
    return NextResponse.json({ error: '缺少 scopeCode' }, { status: 400 });
  }

  const sort = sortOrder !== undefined ? Number(sortOrder) : 0;
  const active = isActive !== undefined ? String(isActive) === 'true' : undefined;

  const prisma = getKnowledgePrisma();
  await prisma.knowledgeScope.upsert({
    where: { scopeCode },
    update: { scopeName, parentScopeCode, description, aliases, examples, sortOrder: Number.isNaN(sort) ? undefined : sort, isActive: active },
    create: { scopeCode, scopeName: scopeName || '', parentScopeCode, description, aliases, examples, sortOrder: Number.isNaN(sort) ? 0 : sort, isActive: active ?? true },
  });

  return NextResponse.json({ success: true });
}

// DELETE — 删除知识范围
export async function DELETE(request: NextRequest) {
  const auth = authenticateAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { scopeCode } = await request.json() as { scopeCode?: string };
  if (!scopeCode) {
    return NextResponse.json({ error: '缺少 scopeCode' }, { status: 400 });
  }

  const prisma = getKnowledgePrisma();
  await prisma.knowledgeScope.delete({ where: { scopeCode } });
  return NextResponse.json({ success: true });
}
