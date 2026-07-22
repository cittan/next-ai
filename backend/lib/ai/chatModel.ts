import { ChatOpenAI } from '@langchain/openai';
import { config } from '../config';

let _m: ChatOpenAI | null = null;

export function getChatModel(): ChatOpenAI {
    if (_m === null) {
        _m = new ChatOpenAI({
            model: config.ai.chatModel,
            temperature: config.ai.temperature,
            maxTokens: config.ai.maxTokens,
            maxRetries: 3,
            timeout: 60000,
            configuration: {
                baseURL: config.ai.baseUrl,
                apiKey: config.ai.apiKey,
            }
        });
    }
    return _m;
}
