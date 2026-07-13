
export type ParserType = 'pdf' | 'docx' | 'txt' | 'md' | 'html';

export async function parseDocument(buffer: Buffer, format: ParserType): Promise<string> {
    switch (format) {
        case 'pdf': {
            const pdfParser = (await import('pdf-parse')).default;
            return (await pdfParser(buffer)).text;
        }
        case 'docx': {
            const mamoth = (await import('mammoth')).default;
            return (await mamoth.extractRawText({ buffer })).value;
        }
        case 'html': {
            const { convert } = await import('html-to-text');
            return convert(buffer.toString('utf-8'), { wordwrap: false });
        }
        case 'md':
        case 'txt': {
            return buffer.toString();
        }
        default: {
            throw new Error(`不支持的文件格式: ${format}`);
        }
    }
}

export function detectFormat(filename: string): ParserType {
    const extend = filename.split('.').pop()?.toLowerCase();
    switch (extend) {
        case 'pdf': return 'pdf';
        case 'docx': case 'doc': return 'docx';
        case 'html': case 'htm': return 'html';
        case 'md': return 'md';
        case 'txt': return 'txt';
        default: throw new Error(`Unknown: ${extend}`);
    }
}