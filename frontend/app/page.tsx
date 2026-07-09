'use client'

import { useState, useCallback, useEffect } from 'react';
import { ChatSession, chatApi } from '@/lib/chat';

export default function Home() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string}>>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

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

}
