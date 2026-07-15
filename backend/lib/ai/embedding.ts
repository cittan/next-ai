import { ParserType } from "../service/document/parserService";
import { MarkdownTextSplitter, RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { createEmbeddings, estimateTokens } from "./client";

//基于langchain提供的textSplitter进行文本分割，RecursiveCharacterTextSplitter根据字符进行递归分割
export async function splitText(text: string, format: ParserType = 'txt'): Promise<string[]> {
    if (format === 'md') {
        const splitter = new MarkdownTextSplitter({
            chunkSize: 500,
            chunkOverlap: 50
        });
        return await splitter.splitText(text);
    }

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 50,
        separators: ['\n\n', '\n', '。', '！', '？', '；', ';', '，', ',', ' ', '']
    });
    return await splitter.splitText(text);
}

//基于embedding的语义切分

//将文 mode句子进行切分
function splitIntoSentences(text: string): string[] {
    const paragraphs = text.split(/\n\n+/);
    const sentences: string[] = [];
    for (const para of paragraphs) {
        const matches = para.match(/[^。！？.!?]+[。！？.!?]?/g);
        if (matches) {
            sentences.push(...matches.map(match => match.trim()).filter(match => match.length > 0));
        } else if (para.trim().length > 0) {
            sentences.push(para.trim());
        }
    }
    return sentences;
}

//计算余弦相似度
function cosineSimilarity(v1: number[], v2: number[]): number {
    if (v1.length !== v2.length) {
        throw new Error('向量维度不一致');
    }

    let dotProduct = 0;
    let normV1 = 0;
    let normV2 = 0;
    for (let i = 0; i < v1.length; i++) {
        dotProduct += v1[i] * v2[i];
        normV1 += v1[i] * v1[i];
        normV2 += v2[i] * v2[i];
    }
    return dotProduct / (Math.sqrt(normV1) * Math.sqrt(normV2));
}

//真正的文本切分
export async function semanticSplit(text: string, threshould: number = 0.8, maxChunkSize: number = 1000): Promise<string[]> {
    const sentences = splitIntoSentences(text);
    if (sentences.length === 0) {
        return [];
    }
    if (sentences.length === 1) {
        return [sentences[0]];
    }
    const sentenceEmbeddings = await createEmbeddings(sentences);
    const breakpoints: number[] = [];
    for (let i = 0; i < sentenceEmbeddings.length - 1; i++) {
        const similarity = cosineSimilarity(sentenceEmbeddings[i], sentenceEmbeddings[i + 1]);
        //相似度低于阈值，在此处切分
        if (similarity < threshould) {
            breakpoints.push(i);
        }
    }
    const chunks: string[] = [];
    let start = 0;
    for (const bp of breakpoints) {
        const chunk = sentences.slice(start, bp + 1).join('');
        //如果拼接后的chunk大小超过了最大chunk大小，那么按照句子进行拆分
        if (chunk.length > maxChunkSize) {
            let subChunk = '';
            for (let i = start; i < bp; i++) {
                if (subChunk.length + sentences[i].length + 1 > maxChunkSize && subChunk.length > 0) {
                    chunks.push(subChunk);
                    subChunk = sentences[i];
                } else {
                    subChunk += sentences[i];
                }
            }
            if (subChunk.length > 0) {
                chunks.push(subChunk);
            }
        } else {
            chunks.push(chunk);
        }
        start = bp + 1;
    }
    //处理最后一个chunk
    if (start < sentences.length) {
        const lastChunk = sentences.slice(start).join('');
        if (lastChunk.length > maxChunkSize) {
            let subChunk = '';
            for (let i = start; i < sentences.length; i++) {
                if (subChunk.length + sentences[i].length + 1 > maxChunkSize && subChunk.length > 0) {
                    chunks.push(subChunk);
                    subChunk = sentences[i];
                } else {
                    subChunk += sentences[i];
                }
            }
            if (subChunk.length > 0) {
                chunks.push(subChunk);
            }
        } else {
            chunks.push(lastChunk);
        }
    }
    return chunks.filter(chunk => chunk.trim().length > 0);
}

//统一切分入口，根据策略参数选择切分方式
export async function splitTextBySemantic(
    text: string,
    format: ParserType = 'txt',
    useSemantic: boolean = false
): Promise<string[]> {
    // 不启用语义切分时，走规则切分（默认路径）
    if (!useSemantic) {
        return splitText(text, format);
    }

    // 启用语义切分
    // Markdown 特殊处理：先按标题粗切，再对每个 section 做语义细切
    // 这样可以避免跨章节的句子做 embedding 比较（不同章节本来就该切开）
    if (format === 'md') {
        // 按 Markdown 标题（# ## ### 等）切分为 section
        // 正则 (?=^#{1,6}\s) 是前瞻断言，在标题前切但保留标题文本
        const sections = text.split(/(?=^#{1,6}\s)/m);
        const allChunks: string[] = [];

        for (const section of sections) {
            if (section.trim().length === 0) continue;
            // 对每个 section 独立做语义切分
            const chunks = await semanticSplit(section);
            allChunks.push(...chunks);
        }

        return allChunks;
    }
    return await semanticSplit(text);
}

//批量计算文本的embedding
export async function embedTexts(texts: string[]): Promise<number[][]> {
    const batches: string[][] = [];
    let cur: string[] = [], token = 0;

    for (const t of texts) {
        const tk = estimateTokens(t);
        if (token + tk > 2000 && cur.length > 0) {
            batches.push(cur);
            cur = [];
            token = 0;
        }
        cur.push(t);
        token += tk;
    }
    if (cur.length > 0) {
        batches.push(cur);
    }
    const all: number[][] = [];
    for (const batch of batches) {
        const embeddings = await createEmbeddings(batch);
        all.push(...embeddings);
    }
    return all;
}

//对文本进行切分并计算embedding
export async function splitAndEmbed(text: string, format: ParserType = 'txt', useSemantic: boolean = false): Promise<{ chunks: string[], embeddings: number[][] }> {
    const chunks = await splitTextBySemantic(text, format, useSemantic);
    const embeddings = await embedTexts(chunks);
    return { chunks, embeddings };
}