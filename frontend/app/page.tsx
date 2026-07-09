'use client'

import { useState, useCallback, useEffect } from 'react';
import { ChatSession, chatApi } from '@/lib/chat';

export default function Home() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeConversationId, setActiveConversationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string}>>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  //分页查询会话
  const loadingSessions = useCallback(async () => {
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
    loadingSessions();
  }, [loadingSessions]);

  //新建会话
  const handleNewSession = () => {
    setActiveConversationId('');
    setMessages([]);
    setInput('');
  }
  
  const handleSelectSession = async (id: string) => {
    setActiveConversationId(id);
    if(!id){
      setMessages([]);
      return;
    }
    try {
      const res = await chatApi.getExchanges(id);
      setMessages(
        res.exchanges.flatMap((e: any) => [
          { role: 'user' as const, content: e.question },
          { role: 'assistant' as const, content: e.answer },
        ])
      );
    } catch (e: any) {
      console.error(e);
    }
  }
}
