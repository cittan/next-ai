'use client'

import { useState, useCallback, useEffect } from 'react';
import { ChatSession, chatApi } from '@/lib/chat';
import SessionList from '@/components/chat/SessionList';
import { useRouter } from 'next/navigation';
import { getAuth, verifyAuth, logout } from '@/lib/auth';

export default function Home() {
    const router = useRouter();
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeConversationId, setActiveConversationId] = useState('');
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [answer, setAnswer] = useState('');
    const [error, setError] = useState('');

    useEffect(() => { verifyAuth().then(ok => { if (!ok) { router.push('/'); } }); }, []);

    //分页查询会话，useCallback作用是在依赖项没有变化时，保持函数的引用不变，当前函数是空数组，所以不会在每次渲染时都重新创建函数
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

    // 组件挂载时加载会话，
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
        setAnswer('');
        setError('');
        try {
            const r = await chatApi.getExchanges(id);
            const msgs = r.exchanges.flatMap((ex: any) => [
                { role: 'user' as const, content: ex.question },
                { role: 'assistant' as const, content: ex.answer || '' },
            ]);
            setMessages(msgs);
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
            const response = await fetch('/api/chat', {
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
                                    // 检查是否最后一条是 assistant 消息，如果是表示ai正在回复，把添加的string替换掉最后一条assistant消息
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

            // 打字机打完字，判断当前会话id是否是前面上传的新会话，如果是新会话，刷新会话列表
            if (newConversationId && newConversationId !== activeConversationId) {
                await loadSessions();
            }
        } catch (err) {
            console.error('发送失败:', err);
            setMessages((prev) => [...prev, { role: 'assistant', content: '抱歉，发送失败，请重试。' }]);
        }

        setSending(false);
    };

    return (
        <div className='flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'>
            <div className='w-72 flex-shrink-0'>
                <SessionList
                    sessions={sessions}
                    activeConversationId={activeConversationId}
                    onSelectSession={handleSelectSession}
                    onNewSession={handleNewSession}
                    onSessionsChanged={loadSessions}
                    loading={loading}
                />
            </div>
            <div className='flex-1 flex flex-col'>
                <div className='h-14 border-b border-white/20 bg-white/40 backdrop-blur-md flex items-center justify-between px-6'>
                    <h1 className='text-lg font-semibold text-slate-800'>
                        {activeConversationId ? '当前会话' : '新会话'}
                    </h1>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">{getAuth().username}</span>
                        <button onClick={() => { logout(); router.push('/'); }} className="text-sm text-gray-400 hover:text-red-500">退出</button>
                    </div>
                </div>
                <div className='flex-1 overflow-auto p-6 space-y-4'>
                    {messages.length === 0 ? (
                        <div className='text-center text-slate-500'>
                            <p className='text-lg'>开始新的对话</p>
                            <p className='text-sm mt-2'>在下方输入框中输入问题</p>
                        </div>
                    ) : (
                        messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className='max-w-2xl px-4 py-3 rounded-2xl'
                                    style={{
                                        backgroundColor: msg.role === 'user' ? '#6366f1' : 'rgba(255,255,255,0.6)',
                                        color: msg.role === 'user' ? '#ffffff' : '#1e293b',
                                        backdropFilter: msg.role === 'assistant' ? 'blur(4px)' : 'none',
                                        border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.2)' : 'none'
                                    }}
                                >
                                    <p className='whitespace-pre-wrap'>{msg.content}</p>
                                </div>
                            </div>
                        ))
                    )}

                    {sending && (
                        <div className='flex justify-center'>
                            <div className='bg-white-60 backdrop-blur-sm border border-white/20 px-4 py-3 rounded-2xl'>
                                <div className='flex gap-1'>
                                    <span className='w-2 h-2 bg-slate-400 rounded-full animate-bounce' style={{ animationDelay: '0ms' }} />
                                    <span className='w-2 h-2 bg-slate-400 rounded-full animate-bounce' style={{ animationDelay: '100ms' }} />
                                    <span className='w-2 h-2 bg-slate-400 rounded-full animate-bounce' style={{ animationDelay: '200ms' }} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className='border-t border-white/20 bg-white/40 backdrop-blur-md p-4'>
                    <div className='flex gap-3 max-w-4xl mx-auto'>
                        <input value={input} onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                            placeholder='输入问题' disabled={sending}
                            className='flex-1 px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl text-slate-800 placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-primary-400/50 disabled:opacity-50'
                        />
                        <button onClick={handleSend} disabled={sending || !input.trim()} className='px-6 py-3 bg-primary-500 text-white rounded-xl 
            font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300'>发送</button>
                    </div>
                </div>
            </div>
        </div>

    )
}