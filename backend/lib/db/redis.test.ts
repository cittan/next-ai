import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getRedis } from './redis';

async function runTests() {
  console.log('=== Redis 客户端测试 ===');

  // 测试 1：单例模式
  const r1 = getRedis();
  const r2 = getRedis();
  console.assert(r1 === r2, '应该返回同一个 Redis 实例');
  console.log('✓ Redis 单例模式正常');

  // 测试 2：连接状态
  const status = r1.status;
  console.log('✓ Redis 连接状态:', status);
  console.assert(status === 'ready' || status === 'connecting', '连接状态应该是 ready 或 connecting');

  // 测试 3：基本操作 - SET/GET
  try {
    const testKey = 'test:super-agent:' + Date.now();
    const testValue = 'hello-world';
    
    await r1.set(testKey, testValue, 'EX', 10); // 10秒后自动过期
    console.log('✓ Redis SET 操作成功');
    
    const retrieved = await r1.get(testKey);
    console.assert(retrieved === testValue, 'GET 应该返回设置的值');
    console.log('✓ Redis GET 操作成功，值:', retrieved);
    
    // 清理测试数据
    await r1.del(testKey);
    console.log('✓ Redis DEL 操作成功');
  } catch (err: any) {
    console.error('✗ Redis 操作失败:', err.message);
    console.log('提示：请检查 Redis 服务是否启动，以及 REDIS_HOST 等环境变量配置');
    process.exit(1);
  }

  // 测试 4：PING 命令
  try {
    const pong = await r1.ping();
    console.assert(pong === 'PONG', 'PING 应该返回 PONG');
    console.log('✓ Redis PING 命令正常:', pong);
  } catch (err: any) {
    console.error('✗ Redis PING 失败:', err.message);
  }

  console.log('\n所有测试通过！');
  r1.disconnect();
}

runTests();