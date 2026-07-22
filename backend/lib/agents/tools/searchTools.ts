import { config } from "@/lib/config";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

interface TavilySearchResult {
    title: string;
    url: string;
    content: string;
}

async function doTavilySearch(query: string): Promise<string> {
    if (!config.tavily.apiKey) {
        throw new Error("Tavily API key not set");
    }

    const response = await fetch(`${config.tavily.baseUrl}${config.tavily.searchPath}`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            api_key: config.tavily.apiKey,
            query,
            topic: config.tavily.topic,
            search_depth: config.tavily.searchDepth,
            max_results: config.tavily.maxResults,
            include_answer: config.tavily.includeAnswer,
            include_raw_content: config.tavily.includeRawContent,
        }),
    });

    if (!response.ok) {
        return `搜索失败: ${response.status} ${response.statusText}`;
    }

    const data = await response.json() as TavilySearchResult[];
    const results = data || [];
    if (results.length === 0) {
        return '未找到相关搜索结果';
    }


    const formatted = results
        .slice(0, 5)
        .map(
            (r, i) =>
                `[${i + 1}] ${r.title}\n   URL: ${r.url}\n   内容: ${r.content.slice(0, 500)}`,
        )
        .join('\n\n');

    return formatted;
}


export const tavilySearchTool = tool(
    async ({ query }) => {
        return doTavilySearch(query);
    },
    {
        name: 'tavily_search',
        description:
            '通过 Tavily 搜索引擎搜索互联网信息。当用户询问实时信息、最新事件、新闻、趋势' +
            '或知识库中未覆盖的内容时使用此工具。输入应为搜索关键词（中文或英文）。',
        schema: z.object({
            query: z.string().describe('搜索关键词'),
        }),
    },
)