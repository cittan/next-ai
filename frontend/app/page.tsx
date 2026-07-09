'use client'

import { useState, useCallback, useEffect } from 'react';
import { ChatSession, chatApi } from '@/lib/chat';

export default function Home() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeConversationId, setActiveConversationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  //分页查询会话
  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await chatApi.listSessions();
      setSessions(res.sessions);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]); 

  //新建会话
  const handleNewSession = () => {
    setActiveConversationId('');
    setMessages([]);
    setInput('');
  }

  const handleSelectSession = async (id: string) => {
    setActiveConversationId(id);
    if (!id) {
      setMessages([]);
      return;
    }
    try {
      const res = await chatApi.getExchanges(id);
      setMessages(
        //flatMap把数组展开成一维
        res.exchanges.flatMap((e: any) => [
          { role: 'user' as const, content: e.question },
          { role: 'assistant' as const, content: e.answer },
        ])
      );
    } catch (e: any) {
      console.error(e);
    }
  }

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const question = input.trim();
    setInput('');
    // 立即显示用户消息
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setSending(true);

    try {
      // 调用流式聊天 API
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          conversationId: activeConversationId || undefined,  // 新会话不传 conversationId
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      // 读取 SSE 流
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = '';           // AI 回复内容（逐步累积）
      let newConversationId = activeConversationId;  // 新会话ID（首次响应返回）

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n');

          // 解析 SSE 数据
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              // 首次响应会返回 conversationId，用于后续消息关联
              if (parsed.conversationId && !newConversationId) {
                newConversationId = parsed.conversationId;
                setActiveConversationId(newConversationId);
              }

              // 累积 AI 回复内容
              if (parsed.content) {
                assistantMsg += parsed.content;
                // 更新消息列表（替换最后一条 assistant 消息或新增）
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'assistant') {
                    return [...prev.slice(0, -1), { role: 'assistant', content: assistantMsg }];
                  }
                  return [...prev, { role: 'assistant', content: assistantMsg }];
                });
              }
            } catch {
              // 忽略解析错误（可能是部分数据）
            }
          }
        }
      }

      // 如果是新会话，刷新会话列表
      if (newConversationId && newConversationId !== activeConversationId) {
        await loadSessions();
      }
    } catch (err) {
      console.error('发送失败:', err);
      setMessages((prev) => [...prev, { role: 'assistant', content: '抱歉，发送失败，请重试。' }]);
    }

    setSending(false);
  };

  return
}