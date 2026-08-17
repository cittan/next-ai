import { ChatRequestSchema, type ChatStreamEvent } from '@next-ai/contracts';
import { Router } from 'express';
import { runChat } from '../../application/chat/chat.service';

function send(res: any, event: ChatStreamEvent) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

export function createChatRouter(): Router {
  const router = Router();
  router.post('/api/chat', async (req, res) => {
    const parsed = ChatRequestSchema.safeParse({ chatMode: 'OPEN_CHAT', ...req.body });
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid chat request', details: parsed.error.flatten(), requestId: res.locals.requestId } });
      return;
    }

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    const abort = new AbortController();
    req.on('close', () => abort.abort());
    let identity: { conversationId: string; exchangeId: number } | undefined;

    try {
      const result = await runChat(parsed.data, {
        session(conversationId, exchangeId) {
          identity = { conversationId, exchangeId };
          send(res, { type: 'session', conversationId, exchangeId });
        },
        token(token) {
          if (identity && !res.writableEnded) send(res, { type: 'token', ...identity, token });
        },
      }, abort.signal);
      if (!abort.signal.aborted && !res.writableEnded) send(res, { type: 'done', ...result });
    } catch (error) {
      if (identity && !res.writableEnded) send(res, { type: 'error', ...identity, code: 'CHAT_FAILED', message: error instanceof Error ? error.message : 'Chat failed' });
    } finally {
      if (!res.writableEnded) res.end();
    }
  });
  return router;
}
