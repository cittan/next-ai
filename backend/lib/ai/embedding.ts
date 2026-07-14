import { ParserType } from "../service/document/parserService";
import { MarkdownTextSplitter, RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

//基于langchain提供的textSplitter进行文本分割，RecursiveCharacterTextSplitter根据字符进行递归分割
export async function splitText(text: string, format: ParserType='txt'): Promise<string[]> {
    if(format === 'md'){
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

//将文本按句子进行切分
function splitIntoSentences(text: string): string[] {
    const paragraphs = text.split(/\n\n+/);
    const sentences: string[] = [];
    for(const para of paragraphs){
        const matches = para.match(/[^。！？.!?]+[。！？.!?]?/g);
        if(matches){
            sentences.push(...matches.map(match => match.trim()).filter(match => match.length > 0));
        } else if(para.trim().length > 0) {
            sentences.push(para.trim());
        }
    }
    return sentences;
}