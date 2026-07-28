import { sendMessage } from '../../db/kafka';
import { config } from '../../config';

export class ProducerService {
  /**
   * 发送文档解析路由消息。
   */
  async sendParseRoute(
    documentId: number,
    taskId: number,
    objectName: string,
    retryCount?: number,
  ): Promise<void> {
    await sendMessage(config.kafka.parseTopic, {
      key: `parse_${documentId}_${taskId}`,
      value: JSON.stringify({
        documentId,
        taskId,
        objectName,
        retryCount: retryCount ?? 0,
        timestamp: Date.now(),
      }),
    });
  }

  /**
   * 发送文档索引构建消息。
   */
  async sendIndexBuild(
    documentId: number,
    taskId: number,
    planId: number,
    retryCount?: number,
  ): Promise<void> {
    await sendMessage(config.kafka.indexTopic, {
      key: `index_${documentId}_${taskId}`,
      value: JSON.stringify({
        documentId,
        taskId,
        planId,
        retryCount: retryCount ?? 0,
        timestamp: Date.now(),
      }),
    });
  }
}

export const producerService = new ProducerService();
