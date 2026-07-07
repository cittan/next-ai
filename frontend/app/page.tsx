'use client'

import { useState, useRef } from 'react';
import { flushSync } from 'react-dom';
import { api } from '@/lib/client';

export default function Home() {
  //问题
  const [q, setQ] = useState('');
  //回答
  const [a, setA] = useState('');
  //加载中
  const [loading, setLoading] = useState(false);
  //错误
  const [error, setError] = useState('');

  //存储AbortController引用，AbortController用于取消进行的异步操作，常见取消fetch请求
  const abortRef = useRef<AbortController | null>(null);

  //发送请求的方法，请求后端的/chat接口
  const send = async () => {
    if (!q.trim() || loading) {
      return;
    }
    setA('');
    setLoading(true);
    setError('');

    //创建AbortController实例，用于取消请求 ctrl.abort()用于发送一个AbortError事件，触发catch块
    const ctrl = new AbortController();
    abortRef.current = ctrl;


    try {
      const r = await fetch('/api/chat',
        {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q }), signal: ctrl.signal
        });
      if (!r.ok) {
        const e = await r.json().catch(() => ({ error: 'Failed' }));
        setError(e.error);
        return;
      }
      //和后端的controller相对应，后端controller.enqueue生产事件，前端使用getReader读取事件，返回ReadableStreamDefaultReader
      const reader = r.body?.getReader();
      if (!reader) {
        throw new Error('Failed to read response body');
      }
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';
        for (const e of events) {
          if (!e.startsWith('data:')) continue;
          try {
            const data = JSON.parse(e.slice(6));
            if (data.type === 'token') {
              //强制回调完成后立刻同步渲染dom，跳过批处理
              flushSync(() => { setA(p => p + data.content); });
              // 等浏览器绘制完这一帧，再处理下一个 token
              await new Promise(r => requestAnimationFrame(r));
            } else if (data.type === 'error') {
              setError(data.message);
            }
          } catch { }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(e.message);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  //渲染页面
  return (
    <main className='min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4'>
      <div className='w-full max-w-2xl'>
        <h1 className='text-3xl font-bold text-center mb-8'>
          Super Agent
        </h1>
        {(a || error) && <div className={`mb-6 p-4 rounded-xl ${error ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200 shadow-sm'}`}>
          {error ? <p className='text-red-500'>{error}</p> : <div className='whitespace-pre-wrap'>{a}
            {loading && <span className='inline-block w-2 h-4 bg-blue-500 ml-0.5 animate-pulse' />}</div>}</div>}
        <div className='flex gap-3'>
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="输入问题" disabled={loading}
            className='flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100' />
          {loading ? <button onClick={() => abortRef.current?.abort()}
            className='px-6 py-3 bg-red-500 text-white rounded-xl font-medium'>停止</button> :
            <button onClick={send} disabled={loading || !q.trim()}
              className='px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disableed:opacity-50'>{loading ? '发送中' : '发送'}</button>}
        </div>
      </div>
    </main>
  )

}
