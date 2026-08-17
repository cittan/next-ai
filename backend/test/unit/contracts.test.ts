import { describe, expect, it } from 'vitest';
import {
  ApiErrorEnvelopeSchema,
  ChatRequestSchema,
  ChatStreamEventSchema,
  ExchangesQuerySchema,
  MemorySummarySchema,
  PaginationQuerySchema,
  RenameSessionSchema,
  SessionIdParamsSchema,
  KnowledgeScopeParamsSchema,
  KnowledgeTopicParamsSchema,
  KnowledgeTopicsQuerySchema,
  DocumentIdParamsSchema,
  DocumentListQuerySchema,
  DocumentUploadResponseSchema,
  UpdateKnowledgeScopeSchema,
  UpdateKnowledgeTopicSchema,
  apiRoutes,
} from '@next-ai/contracts';

describe('shared contracts', () => {
  it('coerces pagination query values', () => {
    expect(PaginationQuerySchema.parse({ page: '2', pageSize: '20' })).toEqual({
      page: 2,
      pageSize: 20,
      keyword: undefined,
    });
  });

  it('rejects an empty chat question', () => {
    expect(() => ChatRequestSchema.parse({ question: '   ', chatMode: 'OPEN_CHAT' })).toThrow();
  });

  it('accepts each terminal SSE event shape', () => {
    expect(ChatStreamEventSchema.parse({
      type: 'done',
      conversationId: '8e928b74-7f80-4eb0-9484-3f93460976bb',
      exchangeId: 1,
      totalLatencyMs: 42,
    }).type).toBe('done');
  });

  it('constructs resource routes without page-owned strings', () => {
    expect(apiRoutes.sessions.exchanges('abc')).toBe('/api/chat/sessions/abc/exchanges');
    expect(apiRoutes.documents.index(7)).toBe('/api/manage/documents/7/index');
  });

  it('validates the standard error envelope', () => {
    expect(ApiErrorEnvelopeSchema.parse({
      error: { code: 'BAD_REQUEST', message: 'invalid', details: null, requestId: 'req_test' },
    }).error.code).toBe('BAD_REQUEST');
  });

  it('requires the complete memory summary response', () => {
    expect(() => MemorySummarySchema.parse({
      conversationId: 'c1', summary: '', coveredExchangeId: 0, compressionCount: 0,
    })).toThrow();
  });

  it('exports session request schemas', () => {
    expect(SessionIdParamsSchema.parse({ id: '8e928b74-7f80-4eb0-9484-3f93460976bb' }).id)
      .toBe('8e928b74-7f80-4eb0-9484-3f93460976bb');
    expect(ExchangesQuerySchema.parse({}).limit).toBe(50);
    expect(RenameSessionSchema.parse({ title: '  Renamed  ' }).title).toBe('Renamed');
  });

  it('exports document request and upload response schemas', () => {
    expect(DocumentListQuerySchema.parse({})).toEqual({ page: 1, pageSize: 10 });
    expect(DocumentListQuerySchema.parse({ keyword: ' handbook ' })).toEqual({ page: 1, pageSize: 10, keyword: 'handbook' });
    expect(DocumentIdParamsSchema.parse({ documentId: '7' }).documentId).toBe(7);
    expect(DocumentUploadResponseSchema.parse({
      documentId: 1, taskId: 2, documentName: 'handbook.txt', parseStatus: 2, strategyStatus: 1, indexStatus: 1,
    }).taskId).toBe(2);
  });

  it('exports knowledge resource params and topic filtering schemas', () => {
    expect(KnowledgeScopeParamsSchema.parse({ scopeCode: ' hr ' }).scopeCode).toBe('hr');
    expect(KnowledgeTopicParamsSchema.parse({ topicCode: ' payroll ' }).topicCode).toBe('payroll');
    expect(KnowledgeTopicsQuerySchema.parse({ scopeCode: ' hr ' }).scopeCode).toBe('hr');
    expect(() => KnowledgeScopeParamsSchema.parse({ scopeCode: ' ' })).toThrow();
    expect(() => UpdateKnowledgeScopeSchema.parse({})).toThrow();
    expect(() => UpdateKnowledgeTopicSchema.parse({})).toThrow();
  });
});
