'use client'

import { useState } from 'react';
import { api } from '@/lib/client';

export default function Home() {
  const [q, setQ] = useState('');
  const [a, setA] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const send = async () => {
    if (!q.trim() || loading) {
      return;
    }
    setA('');
    setLoading(true);
    setError('');
    try {
      const r = await api.post<{ answer: string }>('/api/chat', { question: q });
      setA(r.answer);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className='min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4'>
      <div className='w-full max-w-2xl'>
        <h1 className='text-3xl font-bold text-center mb-8'>
          Super Agent
        </h1>
        {(a || error) && <div className={`mb-6 p-4 rounded-xl ${error ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200 shadow-sm'} border`}>
          {error ? <p className='text-red-500'>{error}</p> : <div className='whitespace-pre-wrap'>{a}</div>}</div>}
        <div className='flex gap-3'>
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="输入问题" disabled={loading}
          className='flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100' />
          <button onClick={send} disabled={loading || !q.trim()}
          className='px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disableed:opacity-50'>{loading ? '发送中' : '发送'}</button>
        </div>
      </div>
    </main>
  )

}
