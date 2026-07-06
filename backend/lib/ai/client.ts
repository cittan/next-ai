import OpenAI from 'openai';
import http from 'http';
import https from 'https';
import { config } from '../config';

//创建HTTP和HTTPS代理
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50, keepAliveMsecs: 30000 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50, keepAliveMsecs: 30000 });

//创建OpenAI客户端
let _client: OpenAI | null = null;
export function getAiClient(): OpenAI {
    if (!_client) {
        const isHttps = config.ai.baseUrl.startsWith("https");
        _client = new OpenAI({
            apiKey: config.ai.apiKey,
            baseURL: config.ai.baseUrl,
            httpAgent: isHttps ? httpsAgent : httpAgent,
            timeout: 60000,
            maxRetries: 3
        });
    }
    return _client;
}

//聊天的内容与角色
export interface ChatMessage {
    role: 'system' | 'assistant' | 'user';
    content: string;
}

//获取聊天输出完成的内容
export async function chatCompletion(
    messages: ChatMessage[],
    options: { model?: string, temperature?: number, maxTokens?: number }
): Promise<{
    content: string;
    usage: { promptTokens: number; completionTokens: number; totelTokens: number }
}> {
    const client = getAiClient();
    const response = await client.chat.completions.create(
        {
            model: options.model || config.ai.chatModel,
            messages: messages as any[],
            temperature: options.temperature || config.ai.temperature,
            max_tokens: options.maxTokens || config.ai.maxTokens,
        }
    );
    const choice = response.choices[0];
    return {
        content: choice?.message?.content || "",
        usage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totelTokens: response.usage?.total_tokens || 0,
        },
    };
}




