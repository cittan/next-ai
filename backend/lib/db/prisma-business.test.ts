// backend/lib/db/prisma-business.test.ts
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getBusinessPrisma } from './prisma-business';

async function runTests() {
  console.log('=== Prisma 连接测试 ===');

  // 测试 1：单例模式
  const p1 = getBusinessPrisma();
  const p2 = getBusinessPrisma();
  console.assert(p1 === p2, '应该返回同一个 Prisma 实例');
  console.log('✓ Prisma 单例模式正常');

  // 测试 2：数据库连接
  try {
    await p1.$connect();
    console.log('✓ 数据库连接成功');
  } catch (err: any) {
    console.error('✗ 数据库连接失败:', err.message);
    console.log('提示：请检查 DATABASE_URL 环境变量和数据库服务是否启动');
    process.exit(1);
  }

  // 测试 3：基本查询
  try {
    const count = await p1.conversationSession.count();
    console.log(`✓ 数据库查询正常，当前会话数: ${count}`);
  } catch (err: any) {
    console.error('✗ 数据库查询失败:', err.message);
  }

  await p1.$disconnect();
  console.log('\n所有测试通过！');
}

runTests();