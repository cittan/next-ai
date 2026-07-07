


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
}

//加载配置
function loadConfig(): AppConfig {
    return {
        ai: {
            baseUrl: env("AI_BASE_URL", 'https://dashscope.aliyuncs.com/compatible-mode/v1'),
            apiKey: env("AI_API_KEY", ''),
            chatModel: env("AI_CHAT_MODEL", 'qwen-plus-latest'),
            temperature: envNum("AI_TEMPERATURE", 0.5),
            maxTokens: envNum("AI_MAX_TOKENS", 5000),
        },
        pgsql: {
            host: env('PGSQL_HOST', '192.168.233.200'),
            port: envNum('PGSQL_PORT', 5432),
            database: env('PGSQL_DATABASE', 'super_agent_business_chat'),
            user: env('PGSQL_USER', 'postgres'),
            password: env('PGSQL_PASSWORD', 'postgres'),
            maxPoolSize: envNum('PGSQL_MAX_POOL_SIZE', 10),
        },
        redis: {
            host: env('REDIS_HOST', '192.168.233.200'),
            port: envNum('REDIS_PORT', 6379),
            db: envNum('REDIS_DB', 0),
            password: env('REDIS_PASSWORD', ''),
            timeout: envNum('REDIS_TIMEOUT', 3000),
        },

    }
}

//导出单例
export const config = loadConfig();