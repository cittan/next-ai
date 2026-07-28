import { getKnowledgePrisma } from '../../db/prisma-knowledge';
import { downloadFromMinio } from '../../db/minio';
import { parseDocument, detectFormat, ParserType } from '../../service/document/parserService';
import { uploadFile } from '../../service/document/storageService';
import { strategyService } from './StrategyService';

export interface ParseResult {
  parsedText: string;
  structureNodes: StructureNode[];
  charCount: number;
  structureLevel: number;
  contentQualityLevel: number;
}

export interface StructureNode {
  nodeNo: number;
  nodeType: string;
  depth: number;
  title?: string;
  sectionPath?: string;
  contentText?: string;
  parentNodeId?: number;
}

export class ParserProcessor {
  private get prisma() {
    return getKnowledgePrisma();
  }

  /**
   * 解析文档并提取结构
   */
  async processDocument(
    documentId: number,
    taskId: number,
    objectName: string,
  ): Promise<ParseResult> {
    // 1. 从 MinIO 下载文档
    const buffer = await downloadFromMinio(objectName);
    
    // 2. 检测文件格式并解析
    const fileName = objectName.split('/').pop() || 'document';
    const format = detectFormat(fileName);
    const parsedText = await parseDocument(buffer, format);
    
    // 3. 提取文档结构
    const structureNodes = this.extractStructure(parsedText, format);
    
    // 4. 计算文档特征
    const charCount = parsedText.length;
    const structureLevel = Math.max(...structureNodes.map(n => n.depth), 0);
    const contentQualityLevel = this.assessContentQuality(parsedText, structureNodes);
    
    // 5. 保存结构节点到数据库
    await this.saveStructureNodes(documentId, taskId, structureNodes);
    
    // 6. 上传解析后的文本到 MinIO
    const parsedTextBuffer = Buffer.from(parsedText, 'utf-8');
    const parseTextPath = await uploadFile(
      parsedTextBuffer,
      `${fileName}.txt`,
      'text/plain',
    );
    
    // 7. 更新文档元数据
    await this.prisma.superAgentDocument.update({
      where: { id: documentId },
      data: {
        parseStatus: 3, // 解析成功
        parseTextPath,
        charCount,
        structureLevel,
        contentQualityLevel,
        structureNodeCount: structureNodes.length,
        lastParseTaskId: taskId,
      },
    });
    
    return {
      parsedText,
      structureNodes,
      charCount,
      structureLevel,
      contentQualityLevel,
    };
  }

  /**
   * 提取文档结构（标题层级）
   */
  private extractStructure(text: string, format: ParserType): StructureNode[] {
    const nodes: StructureNode[] = [];
    let nodeNo = 1;
    
    if (format === 'md') {
      // Markdown: 按标题提取结构
      const lines = text.split('\n');
      let currentSection = '';
      let currentDepth = 0;
      let currentTitle = '';
      
      for (const line of lines) {
        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
          // 保存上一个 section
          if (currentTitle || currentSection.trim()) {
            nodes.push({
              nodeNo: nodeNo++,
              nodeType: 'section',
              depth: currentDepth,
              title: currentTitle || undefined,
              sectionPath: this.buildSectionPath(nodes, currentDepth),
              contentText: currentSection.trim() || undefined,
            });
          }
          
          currentDepth = headingMatch[1].length;
          currentTitle = headingMatch[2].trim();
          currentSection = '';
        } else {
          currentSection += line + '\n';
        }
      }
      
      // 保存最后一个 section
      if (currentTitle || currentSection.trim()) {
        nodes.push({
          nodeNo: nodeNo++,
          nodeType: 'section',
          depth: currentDepth,
          title: currentTitle || undefined,
          sectionPath: this.buildSectionPath(nodes, currentDepth),
          contentText: currentSection.trim() || undefined,
        });
      }
    } else if (format === 'html') {
      // HTML: 按 h1-h6 标签提取
      const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
      let match;
      let lastIndex = 0;
      
      while ((match = headingRegex.exec(text)) !== null) {
        const depth = parseInt(match[1]);
        const title = match[2].replace(/<[^>]+>/g, '').trim();
        const contentStart = match.index + match[0].length;
        const nextHeading = headingRegex.exec(text);
        const contentEnd = nextHeading ? nextHeading.index : text.length;
        const content = text.slice(contentStart, contentEnd).trim();
        
        nodes.push({
          nodeNo: nodeNo++,
          nodeType: 'section',
          depth,
          title,
          sectionPath: this.buildSectionPath(nodes, depth),
          contentText: content || undefined,
        });
      }
    } else {
      // 纯文本：按段落提取
      const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
      for (const para of paragraphs) {
        // 检测是否是标题（短文本且没有句号）
        const isTitle = para.length < 100 && !para.includes('。') && !para.includes('.');
        
        nodes.push({
          nodeNo: nodeNo++,
          nodeType: isTitle ? 'title' : 'paragraph',
          depth: isTitle ? 1 : 0,
          title: isTitle ? para.trim() : undefined,
          contentText: para.trim(),
        });
      }
    }
    
    return nodes;
  }

  /**
   * 构建 section 路径
   */
  private buildSectionPath(nodes: StructureNode[], currentDepth: number): string {
    const path: string[] = [];
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (node.depth < currentDepth && node.title) {
        path.unshift(node.title);
        currentDepth = node.depth;
        if (currentDepth === 1) break;
      }
    }
    return path.join(' > ');
  }

  /**
   * 评估内容质量
   */
  private assessContentQuality(text: string, nodes: StructureNode[]): number {
    let score = 0;
    
    // 文本长度
    if (text.length > 10000) score += 3;
    else if (text.length > 5000) score += 2;
    else if (text.length > 1000) score += 1;
    
    // 结构完整性
    if (nodes.length > 10) score += 2;
    else if (nodes.length > 5) score += 1;
    
    // 有标题层级
    const hasHierarchy = nodes.some(n => n.depth > 1);
    if (hasHierarchy) score += 2;
    
    // 内容密度（非空段落比例）
    const nonEmptyNodes = nodes.filter(n => n.contentText && n.contentText.length > 100);
    if (nonEmptyNodes.length > nodes.length * 0.7) score += 2;
    
    return Math.min(score, 10);
  }

  /**
   * 保存结构节点到数据库
   */
  private async saveStructureNodes(
    documentId: number,
    taskId: number,
    nodes: StructureNode[],
  ): Promise<void> {
    // 先删除旧的结构节点
    await this.prisma.documentStructureNode.deleteMany({
      where: { documentId },
    });
    
    // 批量创建新节点
    if (nodes.length > 0) {
      await this.prisma.documentStructureNode.createMany({
        data: nodes.map(node => ({
          documentId,
          parseTaskId: taskId,
          nodeNo: node.nodeNo,
          nodeType: node.nodeType,
          depth: node.depth,
          title: node.title,
          sectionPath: node.sectionPath,
          contentText: node.contentText,
        })),
      });
    }
  }

  /**
   * 推荐分块策略
   */
  async recommendStrategy(
    documentId: number,
    parseResult: ParseResult,
  ): Promise<{ planId: number; steps: any[] }> {
    return strategyService.recommendPlan(documentId, {
      structureLevel: parseResult.structureLevel,
      contentQualityLevel: parseResult.contentQualityLevel,
      charCount: parseResult.charCount,
    });
  }
}

export const parserProcessor = new ParserProcessor();
