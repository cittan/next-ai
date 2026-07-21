//组装rag提示词
export function buildRagPrompt(question: string, evidenceText: string, maxChars: number = 3000){
    const ev = evidenceText.length > maxChars ? evidenceText.slice(0, maxChars) : evidenceText;
    return `参考信息:\n${ev}\n\n用户问题: ${question}\n\n请根据参考信息用中文回答，引用来源编号。`;
}