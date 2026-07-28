/**
 * Next.js 服务端启动钩子 — 自动启动 Kafka 异步处理器。
 * 确保文档解析 / 索引构建消费者在所有场景下都能正常工作。
 *
 * 如果 Kafka 在服务器启动时不可用，会在后台自动重试连接，
 * 避免因 Kafka 临时不可用导致文档构建任务永久卡在"等待中"。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { asyncProcessor } = await import('./lib/services/document/AsyncProcessor');
    await startWithRetry(asyncProcessor, 3);
  }
}

async function startWithRetry(
  processor: { start: () => Promise<void>; stop: () => Promise<void> },
  maxRetries: number,
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await processor.start();
      console.log('[启动钩子] 异步处理器启动成功（Kafka 消费者就绪）');
      return;
    } catch (err: any) {
      console.error(
        `[启动钩子] 异步处理器启动失败（第 ${attempt}/${maxRetries} 次尝试）:`,
        err.message,
      );
      if (attempt < maxRetries) {
        const delay = Math.min(5000 * attempt, 30000); // 5s, 10s, 15s... max 30s
        console.log(`[启动钩子] ${delay / 1000} 秒后重试...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        console.error(
          '[启动钩子] 异步处理器多次重试后仍无法启动。' +
          '文档索引/构建任务将不会自动处理。' +
          '请检查 Kafka 连接状态并重启服务器。',
        );
      }
    }
  }
}
