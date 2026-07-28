import { Kafka, Producer, Consumer, EachMessagePayload, logLevel } from 'kafkajs';
import { config } from '../config';

export class KafkaManager {
  private kafka: Kafka;
  private producer: Producer;
  private consumers: Consumer[] = [];
  private connected = false;

  constructor(cfg = config.kafka) {
    this.kafka = new Kafka({
      clientId: cfg.groupId,
      brokers: cfg.brokers.split(',').map((s) => s.trim()).filter(Boolean),
      logLevel: logLevel.INFO,
      retry: {
        initialRetryTime: 300,
        retries: 5,
        maxRetryTime: 30000,
      },
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: cfg.autoCreateTopics,
      transactionTimeout: 30000,
    });
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    await this.producer.connect();
    this.connected = true;
  }

  async ensureTopics(topics: string[]): Promise<void> {
    const admin = this.kafka.admin();
    await admin.connect();
    try {
      const existing = await admin.listTopics();
      const missing = topics.filter((t) => !existing.includes(t));
      if (missing.length > 0) {
        await admin.createTopics({
          topics: missing.map((t) => ({ topic: t, numPartitions: 4, replicationFactor: 1 })),
        });
        console.log('[Kafka] 已创建主题:', missing.join(', '));
      }
    } finally {
      await admin.disconnect();
    }
  }

  async send(topic: string, key: string, message: Record<string, unknown>): Promise<void> {
    if (!this.connected) {
      throw new Error('KafkaManager is not connected. Call connect() first.');
    }
    await this.producer.send({
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(message),
          timestamp: Date.now().toString(),
        },
      ],
    });
  }

  async consume(
    topic: string,
    handler: (payload: EachMessagePayload) => Promise<void>,
    groupId?: string,
  ): Promise<Consumer> {
    const consumer = this.kafka.consumer({
      groupId: groupId ?? config.kafka.groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      retry: { retries: 3 },
    });

    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });

    await consumer.run({
      autoCommit: true,
      autoCommitInterval: 5000,
      autoCommitThreshold: 100,
      eachMessage: async (payload) => {
        try {
          await handler(payload);
        } catch (err) {
          console.error(`[Kafka] 处理主题"${payload.topic}"消息时出错:`, err);
        }
      },
    });

    this.consumers.push(consumer);
    return consumer;
  }

  async disconnect(): Promise<void> {
    for (const consumer of this.consumers) {
      try {
        await consumer.disconnect();
      } catch (err) {
        console.error('[Kafka] 断开消费者连接时出错:', err);
      }
    }
    this.consumers = [];

    if (this.connected) {
      await this.producer.disconnect();
      this.connected = false;
    }
  }
}

let _manager: KafkaManager | null = null;

function getManager(): KafkaManager {
  if (!_manager) _manager = new KafkaManager();
  return _manager;
}

export async function sendMessage(
  topic: string,
  message: { key: string; value: string },
): Promise<void> {
  const m = getManager();
  await m.connect();
  await m.send(topic, message.key, JSON.parse(message.value));
}

export async function createConsumer(
  groupId: string,
  topics: string[],
  handler: (payload: EachMessagePayload) => Promise<void>,
): Promise<Consumer> {
  const m = getManager();
  await m.connect();
  return m.consume(topics[0], handler, groupId);
}

export async function disconnectConsumer(): Promise<void> {
  if (_manager) {
    await _manager.disconnect();
    _manager = null;
  }
}
