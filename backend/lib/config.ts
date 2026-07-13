


//读取字符串类型的环境变量
function env(key: string, fallback?: string): string {
    return process.env[key] ?? fallback ?? "";
}

//读取数字类型的环境变量
function envNum(key: string, fallback: number): number {
    const value = process.env[key];
    if (value === undefined || value === '') {
        return fallback;
    }
    const n = Number(value);
    return Number.isNaN(n) ? fallback : n;
}

//相关配置的实体
export interface AppConfig {
    ai: {
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
}

//加载配置
function loadConfig(): AppConfig {
    return {
        ai: {
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

    }
}

//导出单例
export const config = loadConfig();