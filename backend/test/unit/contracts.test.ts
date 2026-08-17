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
});
