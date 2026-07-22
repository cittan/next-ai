


function env(key: string, fallback?: string): string {
    return process.env[key] ?? fallback ?? '';
}

function envNum(key: string, fallback: number): number {
    const v = process.env[key];
    if (v === undefined || v === '') return fallback;
    const n = Number(v);
    return Number.isNaN(n) ? fallback : n;
}

function envBool(key: string, fallback: boolean): boolean {
    const v = process.env[key];
    if (v === undefined || v === '') return fallback;
    return v.toLowerCase() === 'true' || v === '1';
}

function envArr(key: string, fallback: string[]): string[] {
    const v = process.env[key];
    if (!v) return fallback;
    return v.split(',').map((s) => s.trim()).filter(Boolean);
}

export interface HistorySummaryConfig {
    enabled: boolean;
    keepRecentTurns: number;
    compressionBatchTurns: number;
    summaryMaxChars: number;
    recentTranscriptMaxChars: number;
}

export interface RewriteOptions {
    enabled: boolean;
    temperature: number;
    topP: number;
    thinking: boolean;
}

export interface RerankConfig {
    enabled: boolean;
    url: string;
    apiKey: string;
    model: string;
    topN: number;
    connectTimeoutMs: number;
    readTimeoutMs: number;
}

export interface RagConfig {
    enabled: boolean;
    rewriteEnabled: boolean;
    rewriteHistoryTurns: number;
    maxSubQuestions: number;
    vectorTopK: number;
    keywordTopK: number;
    candidateTopK: number;
    finalTopK: number;
    minVectorSimilarity: number;
    keywordRelativeScoreFloor: number;
    parentEvidenceMaxChars: number;
    planningHistoryMaxChars: number;
    answerHistoryMaxChars: number;
    totalEvidenceMaxChars: number;
    perSubQuestionEvidenceMaxChars: number;
    noEvidenceReply: string;
    answerSystemPrompt: string;
    keywordChannelEnabled: boolean;
    rerankEnabled: boolean;
    channelTimeoutMs: number;
    subQuestionTimeoutMs: number;
    historySummary: HistorySummaryConfig;
    rewriteOptions: RewriteOptions;
    rerank: RerankConfig;
}

//相关配置的实体
export interface AppConfig {
    ai: {
        embeddingModel: string;
        baseUrl: string;
        apiKey: string;
        chatModel: string;
        temperature: number;
        maxTokens: number;
    };
    pgsql: {
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
        maxPoolSize: number;
    };
    pgvector: {
        host: string;
        port: number;
        database: string;
        schema: string;
        user: string;
        password: string;
        poolName: string;
        maxPoolSize: number;
        minIdle: number;
    };
    redis: {
        host: string;
        port: number;
        db: number;
        password: string;
        timeout: number;
    };
    elasticsearch: {
        uris: string[];
        username: string;
        password: string;
        indexName: string;
        navigationIndexName: string;
        routeIndexName: string;
        analyzer: string;
        searchAnalyzer: string;
        connectTimeout: number;
        socketTimeout: number;
    };
    minio: {
        endpoint: string;
        accessKey: string;
        secretKey: string;
        bucketName: string;
        objectPrefix: string;
        parsedTextPrefix: string;
    };
    admin: {
        username: string;
        password: string;
        tokenSecret: string;
        tokenExpireMinutes: number;
    };
    tavily: {
        enabled: boolean;
        baseUrl: string;
        searchPath: string;
        apiKey: string;
        topic: string;
        searchDepth: string;
        maxResults: number;
        includeAnswer: boolean;
        includeRawContent: boolean;
    };
    rag: RagConfig;
}

//加载配置
function loadConfig(): AppConfig {
    return {
        ai: {
            embeddingModel: env("AI_EMBEDDING_MODEL", ''),
            baseUrl: env("AI_BASE_URL", ''),
            apiKey: env("AI_API_KEY", ''),
            chatModel: env("AI_CHAT_MODEL", ''),
            temperature: envNum("AI_TEMPERATURE", 0.5),
            maxTokens: envNum("AI_MAX_TOKENS", 5000),
        },
        pgsql: {
            host: env('PGSQL_HOST', ''),
            port: envNum('PGSQL_PORT', 5432),
            database: env('PGSQL_DATABASE', ''),
            user: env('PGSQL_USER', ''),
            password: env('PGSQL_PASSWORD', ''),
            maxPoolSize: envNum('PGSQL_MAX_POOL_SIZE', 10),
        },
        pgvector: {
            host: env('PG_HOST', ''),
            port: envNum('PG_PORT', 5432),
            database: env('PG_DATABASE', ''),
            schema: env('PG_SCHEMA', 'public'),
            user: env('PG_USER', ''),
            password: env('PG_PASSWORD', ''),
            poolName: env('PG_POOL_NAME', 'super-agent-pgvector-pool'),
            maxPoolSize: envNum('PG_MAX_POOL_SIZE', 10),
            minIdle: envNum('PG_MIN_IDLE', 2),
        },
        redis: {
            host: env('REDIS_HOST', ''),
            port: envNum('REDIS_PORT', 6379),
            db: envNum('REDIS_DB', 0),
            password: env('REDIS_PASSWORD', ''),
            timeout: envNum('REDIS_TIMEOUT', 3000),
        },
        elasticsearch: {
            uris: env('ES_URIS', '').split(','),
            username: env('ES_USERNAME', ''),
            password: env('ES_PASSWORD', ''),
            indexName: env('ELASTICSEARCH_INDEX_NAME', 'super_agent_business_chat'),
            navigationIndexName: env('ELASTICSEARCH_NAVIGATION_INDEX_NAME', 'super_agent_business_chat_navigation'),
            routeIndexName: env('ELASTICSEARCH_ROUTE_INDEX_NAME', 'super_agent_business_chat_route'),
            analyzer: env('ELASTICSEARCH_ANALYZER', 'ik_max_word'),
            searchAnalyzer: env('ELASTICSEARCH_SEARCH_ANALYZER', 'ik_max_word'),
            connectTimeout: envNum('ELASTICSEARCH_CONNECT_TIMEOUT', 3000),
            socketTimeout: envNum('ELASTICSEARCH_SOCKET_TIMEOUT', 3000),
        },
        minio: {
            endpoint: env('MINIO_ENDPOINT', ''),
            accessKey: env('MINIO_ACCESS_KEY', ''),
            secretKey: env('MINIO_SECRET_KEY', ''),
            bucketName: env('MINIO_BUCKET_NAME', 'super-agent-business-chat'),
            objectPrefix: env('MINIO_OBJECT_PREFIX', 'super-agent-business-chat/'),
            parsedTextPrefix: env('MINIO_PARSED_TEXT_PREFIX', 'super-agent-business-chat/parsed_text/'),
        },
        admin: {
            username: env('ADMIN_USERNAME', ''),
            password: env('ADMIN_PASSWORD', ''),
            tokenSecret: env('ADMIN_TOKEN_SECRET', ''),
            tokenExpireMinutes: envNum('ADMIN_TOKEN_EXPIRE_MINUTES', 720),
        },
        tavily: {
            enabled: envBool('TAVILY_ENABLED', true),
            baseUrl: env('TAVILY_BASE_URL', 'https://api.tavily.com'),
            searchPath: env('TAVILY_SEARCH_PATH', '/search'),
            apiKey: env('TAVILY_API_KEY', ''),
            topic: env('TAVILY_TOPIC', 'general'),
            searchDepth: env('TAVILY_SEARCH_DEPTH', 'advanced'),
            maxResults: envNum('TAVILY_MAX_RESULTS', 5),
            includeAnswer: envBool('TAVILY_INCLUDE_ANSWER', true),
            includeRawContent: envBool('TAVILY_INCLUDE_RAW_CONTENT', false),
        },
        rag: {
            enabled: envBool('RAG_ENABLED', true),
            rewriteEnabled: envBool('RAG_REWRITE_ENABLED', true),
            rewriteHistoryTurns: envNum('RAG_REWRITE_HISTORY_TURNS', 3),
            maxSubQuestions: envNum('RAG_MAX_SUB_QUESTIONS', 3),
            vectorTopK: envNum('RAG_VECTOR_TOP_K', 8),
            keywordTopK: envNum('RAG_KEYWORD_TOP_K', 8),
            candidateTopK: envNum('RAG_CANDIDATE_TOP_K', 10),
            finalTopK: envNum('RAG_FINAL_TOP_K', 5),
            minVectorSimilarity: envNum('RAG_MIN_VECTOR_SIMILARITY', 0.45),
            keywordRelativeScoreFloor: envNum('RAG_KEYWORD_RELATIVE_SCORE_FLOOR', 0.35),
            parentEvidenceMaxChars: envNum('RAG_PARENT_EVIDENCE_MAX_CHARS', 2200),
            planningHistoryMaxChars: envNum('RAG_PLANNING_HISTORY_MAX_CHARS', 3000),
            answerHistoryMaxChars: envNum('RAG_ANSWER_HISTORY_MAX_CHARS', 3000),
            totalEvidenceMaxChars: envNum('RAG_TOTAL_EVIDENCE_MAX_CHARS', 5200),
            perSubQuestionEvidenceMaxChars: envNum('RAG_PER_SUB_QUESTION_EVIDENCE_MAX_CHARS', 2600),
            noEvidenceReply: env('RAG_NO_EVIDENCE_REPLY', '未找到相关信息'),
            answerSystemPrompt: env(
                'RAG_ANSWER_SYSTEM_PROMPT',
                '你是一个基于知识库的智能问答助手。' +
                '请根据提供的参考信息，准确、简洁地回答用户的问题。' +
                '如果参考信息不足以回答问题，请如实告知用户。' +
                '请使用中文回答，并引用相关信息来源。'
            ),
            keywordChannelEnabled: envBool('RAG_KEYWORD_CHANNEL_ENABLED', true),
            rerankEnabled: envBool('RAG_RERANK_ENABLED', false),
            channelTimeoutMs: envNum('RAG_CHANNEL_TIMEOUT_MS', 10000),
            subQuestionTimeoutMs: envNum('RAG_SUB_QUESTION_TIMEOUT_MS', 30000),

            historySummary: {
                enabled: envBool('RAG_HISTORY_SUMMARY_ENABLED', true),
                keepRecentTurns: envNum('RAG_HISTORY_SUMMARY_KEEP_RECENT_TURNS', 2),
                compressionBatchTurns: envNum('RAG_HISTORY_SUMMARY_COMPRESSION_BATCH_TURNS', 10),
                summaryMaxChars: envNum('RAG_HISTORY_SUMMARY_MAX_CHARS', 1000),
                recentTranscriptMaxChars: envNum('RAG_HISTORY_SUMMARY_RECENT_TRANSCRIPT_MAX_CHARS', 2000),
            },
            rewriteOptions: {
                enabled: envBool('RAG_REWRITE_OPTIONS_ENABLED', false),
                temperature: envNum('RAG_REWRITE_OPTIONS_TEMPERATURE', 0.7),
                topP: envNum('RAG_REWRITE_OPTIONS_TOP_P', 0.9),
                thinking: envBool('RAG_REWRITE_OPTIONS_THINKING', false),
            },

            rerank: {
                enabled: envBool('RERANK_ENABLED', false),
                url: env('RERANK_URL', ''),
                apiKey: env('RERANK_API_KEY', ''),
                model: env('RERANK_MODEL', ''),
                topN: envNum('RERANK_TOP_N', 5),
                connectTimeoutMs: envNum('RERANK_CONNECT_TIMEOUT_MS', 5000),
                readTimeoutMs: envNum('RERANK_READ_TIMEOUT_MS', 30000),
            },
        },
    }
}

//导出单例
export const config = loadConfig();