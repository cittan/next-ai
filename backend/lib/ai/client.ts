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
        //string的startsWith返回boolean值
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

//流式聊天，Generator对象类似Iterator对象，用于生成一个可迭代序列，每个元素都是一个值。AsyncGenerator对象则用于异步生成一个可迭代序列，每个元素都是一个Promise对象
//function* 表示这是一个生成器函数，返回一个迭代器对象Generator<>。async function*表示这是一个异步生成器函数，返回一个异步迭代器对象AsyncGenerator<>。
export async function* streamChatCompletion(
    messages: ChatMessage[],
    options: { model?: string, temperature?: number, maxTokens?: number }={}
): AsyncGenerator<{ content: string, finishReason: string | null }> {
    const client = getAiClient();
    const stream = await client.chat.completions.create({
        model: options.model || config.ai.chatModel,
        messages: messages as any[],
        temperature: options.temperature || config.ai.temperature,
        max_tokens: options.maxTokens || config.ai.maxTokens,
        stream: true,
        stream_options: { include_usage: true }
    })
    //等待网络数据传输过来，每次传输一个chunk，就 yield 一个对象 for await
    for await (const chunk of stream) {
        //生成器中yield类似return，可以返回多个对象
        yield { content: chunk.choices[0]?.delta?.content || '', finishReason: chunk.choices?.[0]?.finish_reason || null }
    }
}




