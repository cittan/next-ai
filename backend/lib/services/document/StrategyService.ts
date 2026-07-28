import { getKnowledgePrisma } from '../../db/prisma-knowledge';
import { DocumentStrategyType, DocumentStrategyPipelineType, DocumentStrategyRole } from '../../models/enum';

export class StrategyService {
  private get prisma() {
    return getKnowledgePrisma();
  }

  // 推荐分块策略
  async recommendPlan(
    documentId: number,
    analysis: { structureLevel: number; contentQualityLevel: number; charCount: number },
  ): Promise<{ planId: number; steps: any[] }> {
    const steps = this.buildRecommendedSteps(analysis);
    const prisma = this.prisma;

    const plan = await prisma.documentStrategyPlan.create({
      data: {
        documentId,
        planVersion: 1,
        planSource: 1,
        planStatus: 1,
        strategyCount: steps.length,
        strategySnapShot: JSON.stringify(steps),
        recommendReason: this.generateRecommendReason(analysis),
        steps: {
          create: steps.map((step) => ({
            documentId,
            stepNo: step.stepNo,
            pipelineType: step.pipelineType,
            strategyType: step.strategyType,
            strategyRole: step.strategyRole,
            sourceType: 1,
            executeStatus: 0,
            recommendReason: step.recommendReason || '',
          })),
        },
      },
    });

    await prisma.superAgentDocument.update({
      where: { id: documentId },
      data: { strategyStatus: 2, currentPlanId: plan.id },
    });

    return { planId: plan.id, steps };
  }

  // 构建推荐步骤
  private buildRecommendedSteps(analysis: {
    structureLevel: number;
    contentQualityLevel: number;
    charCount: number;
  }): any[] {
    const steps: any[] = [];

    if (analysis.structureLevel > 0) {
      // 有标题结构 → 按结构切分
      steps.push({
        stepNo: 1,
        pipelineType: DocumentStrategyPipelineType.PARENT,
        strategyType: DocumentStrategyType.STRUCTURE,
        strategyRole: DocumentStrategyRole.PRIMARY,
        recommendReason: '基于文档结构拆分父块',
      });
    } else if (analysis.charCount > 1000) {
      // 无结构但有足够内容 → 语义切分
      steps.push({
        stepNo: 1,
        pipelineType: DocumentStrategyPipelineType.PARENT,
        strategyType: DocumentStrategyType.SEMANTIC,
        strategyRole: DocumentStrategyRole.PRIMARY,
        recommendReason: '无文档结构，使用语义相似度切分',
      });
    }

    if (analysis.charCount > 5000) {
      steps.push({
        stepNo: steps.length + 1,
        pipelineType: DocumentStrategyPipelineType.CHILD,
        strategyType: DocumentStrategyType.RECURSIVE,
        strategyRole: DocumentStrategyRole.FALLBACK,
        recommendReason: '递归切分长文本兜底',
      });
    }

    return steps;
  }

  private generateRecommendReason(analysis: {
    structureLevel: number;
    contentQualityLevel: number;
    charCount: number;
  }): string {
    const reasons: string[] = [];
    if (analysis.structureLevel > 0) reasons.push(`检测到 ${analysis.structureLevel} 级结构层次`);
    if (analysis.contentQualityLevel >= 5) reasons.push('内容质量良好');
    reasons.push(`总字符数: ${analysis.charCount}`);
    return reasons.join('；');
  }

  // 执行策略（简化版）
  async executeStrategy(
    documentId: number,
    planId: number,
    parsedText: string,
    structureNodes: any[],
  ): Promise<{ parentBlockCount: number; chunkCount: number }> {
    // 简化实现，实际需要根据策略执行分块
    return { parentBlockCount: 0, chunkCount: 0 };
  }
}

export const strategyService = new StrategyService();
