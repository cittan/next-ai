import { EachMessagePayload } from 'kafkajs';
import { createConsumer, disconnectConsumer } from '../../db/kafka';
import { getKnowledgePrisma } from '../../db/prisma-knowledge';
import { config } from '../../config';
import { producerService } from './ProducerService';
import { parserProcessor } from './ParserProcessor';
import { indexingProcessor } from './IndexingProcessor';

export class AsyncProcessor {
  private running = false;
  private static readonly MAX_RETRIES = 3;

  private get prisma() {
    return getKnowledgePrisma();
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    // 确保主题存在
    const { KafkaManager } = await import('../../db/kafka');
    const km = new KafkaManager();
    await km.ensureTopics([config.kafka.parseTopic, config.kafka.indexTopic]);

    // 同类消费者共享 groupId，由 Kafka 分配分区。
    const consumerCount = Number(process.env.KAFKA_CONSUMER_COUNT || 1);
    for (let i = 0; i < consumerCount; i++) {
      await createConsumer(
        `${config.kafka.groupId}-parse`,
        [config.kafka.parseTopic],
        this.handleParseRoute.bind(this),
      );

      await createConsumer(
        `${config.kafka.groupId}-index`,
        [config.kafka.indexTopic],
        this.handleIndexBuild.bind(this),
      );
    }

    console.log(`[异步处理器] 已启动 ${consumerCount} 组解析/索引消费者`);
  }

  async stop(): Promise<void> {
    this.running = false;
    await disconnectConsumer();
    console.log('[异步处理器] 已停止消费者');
  }

  // 处理文档解析任务
  private async handleParseRoute(payload: EachMessagePayload): Promise<void> {
    const message = JSON.parse(payload.message.value!.toString());
    const { documentId, taskId, objectName } = message;
    const retryCount: number = message.retryCount ?? 0;

    console.log(`[异步处理器] 解析路由: 文档=${documentId}, 任务=${taskId}, 重试=${retryCount}`);

    const prisma = this.prisma;
    const startTime = new Date();

    try {
      await prisma.documentTask.update({
        where: { id: taskId },
        data: { taskStatus: 1, currentStage: 1, startTime, retryCount },
      });

      // 更新文档状态为解析中
      await prisma.superAgentDocument.update({
        where: { id: documentId },
        data: { parseStatus: 2 },
      });

      // 调用 ParserProcessor 处理文档
      const parseResult = await parserProcessor.processDocument(documentId, taskId, objectName);

      // 推荐分块策略
      const strategyResult = await parserProcessor.recommendStrategy(documentId, parseResult);

      const costMillis = new Date().getTime() - startTime.getTime();
      await prisma.documentTask.update({
        where: { id: taskId },
        data: { taskStatus: 2, currentStage: 2, finishTime: new Date(), costMillis },
      });

      console.log(`[异步处理器] 解析完成: 文档=${documentId}, 策略=${strategyResult.planId}, 耗时=${costMillis}ms`);
    } catch (err: any) {
      console.error(`[异步处理器] 文档解析失败 document=${documentId} (重试=${retryCount}):`, err);

      if (retryCount < AsyncProcessor.MAX_RETRIES) {
        await prisma.documentTask.update({
          where: { id: taskId },
          data: { retryCount: retryCount + 1, errorCode: 'PARSE_FAILED', errorMsg: err.message },
        });
        await producerService.sendParseRoute(documentId, taskId, objectName, retryCount + 1);
        console.log(`[异步处理器] 解析重试已入队: 文档=${documentId}, 下次重试=${retryCount + 1}`);
      } else {
        await prisma.superAgentDocument.update({
          where: { id: documentId },
          data: { parseStatus: 4, parseErrorMsg: err.message },
        });
        await prisma.documentTask.update({
          where: { id: taskId },
          data: {
            taskStatus: 3, currentStage: 0, finishTime: new Date(),
            retryCount, errorCode: 'PARSE_FAILED', errorMsg: err.message,
          },
        });
      }
    }
  }

  // 处理索引构建任务
  private async handleIndexBuild(payload: EachMessagePayload): Promise<void> {
    const message = JSON.parse(payload.message.value!.toString());
    const { documentId, taskId, planId } = message;
    const retryCount: number = message.retryCount ?? 0;

    console.log(`[异步处理器] 索引构建: 文档=${documentId}, 任务=${taskId}, 计划=${planId}, 重试=${retryCount}`);

    const prisma = this.prisma;
    const startTime = new Date();

    try {
      await prisma.documentTask.update({
        where: { id: taskId },
        data: { taskStatus: 1, currentStage: 1, startTime, retryCount },
      });

      // 更新文档状态为索引构建中
      await prisma.superAgentDocument.update({
        where: { id: documentId },
        data: { indexStatus: 2 },
      });

      // 调用 IndexingProcessor 构建索引
      const result = await indexingProcessor.buildIndex(documentId, taskId, planId);

      const costMillis = new Date().getTime() - startTime.getTime();
      await prisma.documentTask.update({
        where: { id: taskId },
        data: { taskStatus: 2, currentStage: 2, finishTime: new Date(), costMillis },
      });

      console.log(`[异步处理器] 索引构建完成: 文档=${documentId}, 父块=${result.parentBlockCount}, 分块=${result.chunkCount}, 耗时=${costMillis}ms`);
    } catch (err: any) {
      console.error(`[异步处理器] 索引构建失败 document=${documentId} (重试=${retryCount}):`, err);

      if (retryCount < AsyncProcessor.MAX_RETRIES) {
        await prisma.documentTask.update({
          where: { id: taskId },
          data: { retryCount: retryCount + 1, errorCode: 'INDEX_FAILED', errorMsg: err.message },
        });
        await producerService.sendIndexBuild(documentId, taskId, planId, retryCount + 1);
        console.log(`[异步处理器] 索引构建重试已入队: 文档=${documentId}, 下次重试=${retryCount + 1}`);
      } else {
        await prisma.superAgentDocument.update({
          where: { id: documentId },
          data: { indexStatus: 4 },
        });
        await prisma.documentTask.update({
          where: { id: taskId },
          data: {
            taskStatus: 3, currentStage: 0, finishTime: new Date(),
            retryCount, errorCode: 'INDEX_FAILED', errorMsg: err.message,
          },
        });
      }
    }
  }
}

export const asyncProcessor = new AsyncProcessor();
