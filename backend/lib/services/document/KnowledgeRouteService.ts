import { getEsClient } from '../../db/elasticsearch';
import { config } from '../../config';

export interface KnowledgeRouteIndexRecord {
  routeId: string;
  scopeCode: string;
  topicCode?: string;
  keywords: string;
  aliases?: string;
  examples?: string;
  priority?: number;
}

// ---------------------------------------------------------------
// KnowledgeRouteService — 用于知识路由的 ES 路由索引
// ---------------------------------------------------------------
export class KnowledgeRouteService {
  /**
   * 批量索引路由记录。
   */
  async bulkIndexRoutes(records: KnowledgeRouteIndexRecord[]): Promise<void> {
    if (records.length === 0) return;
    const es = getEsClient();
    const body: any[] = [];

    for (const record of records) {
      body.push({ index: { _index: config.elasticsearch.routeIndexName, _id: record.routeId } });
      body.push(record);
    }

    await es.bulk({ body, refresh: true });
  }
}

export const knowledgeRouteService = new KnowledgeRouteService();
