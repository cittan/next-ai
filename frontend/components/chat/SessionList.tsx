//客户端组件
'use client'

import { ChatSession, MemorySummary, chatApi } from "@/lib/chat";
import { useCallback, useEffect, useRef, useState } from "react";

//会话组件props
interface Props {
    sessions: ChatSession[]; //会话列表数组
    activeConversationId: string; //当前选中的会话id
    onSelectSession: (id: string) => void; //选择会话的回调函数
    onNewSession: () => void; //创建新会话的回调函数
    onSessionsChanged?: () => void; //改变会话列表的回调函数
    loading: boolean;  //正在加载
}

//右键弹窗
interface ContextMenu {
    x: number; //上下文菜单x坐标
    y: number; //上下文菜单y坐标
    session: ChatSession; //右键的会话
}

interface ConfirmModal {
    title: string; //弹窗的标题
    message: string; //弹窗的信息
    confirmLabel: string; //确认按钮的文本
    confirmClass: string; //确认按钮的样式类
    onConfirm: () => void; //确认的回调函数
}

//会话列表组件
export default function SessionList({ sessions, activeConversationId, onSelectSession, onNewSession, onSessionsChanged, loading }: Props) {
    const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null); //右键弹窗状态管理
    const [summaryModal, setSummaryModal] = useState<{ conversationId: string, data: MemorySummary | null, loading: boolean } | null>(null); //记忆摘要弹窗状态
    const [editingId, setEditingId] = useState<string | null>(null);  //正在编辑的会话id的状态
    const [editTitle, setEditTitle] = useState<string>('');  //正在编辑的会话标题的状态，输入框中的编辑的文本
    const [originalTitle, setOriginalTitle] = useState<string>(''); //原始会话标题的状态
    const [hoveredId, setHoveredId] = useState<string | null>(null); //悬停的会话的id的状态
    const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null); //确认弹窗状态
    const [saving, setSaving] = useState<boolean>(false); //正在保存的状态

    const menuRef = useRef<HTMLDivElement>(null); //右键弹窗的引用
    const originalTitleRef = useRef<string>("");  //会话原始标题的引用

    //在会话原始标题改变时，更新原始会话标题的引用值
    useEffect(() => {
        originalTitleRef.current = originalTitle;
    }, [originalTitle])

    //在右键菜单状态发生变化时（点击页面任意位置），关闭弹窗
    useEffect(() => {
        if (!contextMenu) {
            return;
        };
        const close = () => setContextMenu(null);
        //添加点击事件监听器，点击页面任意位置关闭弹窗，第一个是事件，第二个是回调函数
        document.addEventListener('click', close);
        return () => {
            //移除点击事件监听器
            document.removeEventListener('click', close);
        }
        //更新和contextMenu内部属性的变化无关
    }, [contextMenu])

    //在编辑框打开时，点击编辑框外部关闭编辑框
    useEffect(() => {
        if (!editingId) {
            return;
        };
        //添加鼠标点击事件监听器，点击编辑框外部关闭编辑框
        const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            //closest方法用于查找最近的祖先元素，满足指定的条件，标签中有data-edit-row属性，返回最近的祖先元素或null
            if (target.closest("[data-edit-row]")) {
                return;
            };
            setEditingId(null);
            setEditTitle(originalTitleRef.current);
        };
        //延迟注册监听器，避免点击编辑框内部触发关闭，在点击完毕后再注册监听器，确保点击事件先触发
        setTimeout(() => {
            document.addEventListener('click', handler)
        }, 0);
        return () => {
            //移除点击事件监听器
            document.removeEventListener('click', handler);
        }
    }, [editingId]);

    //开始编辑会话标题
    const startEdit = (s: ChatSession) => {
        setEditingId(s.conversationId);
        setEditTitle(s.title || '');
        setOriginalTitle(s.title || '');
    }

    //使用useCallback是确保当前函数在editingId、editTitle、onSessionsChanged 没变的情况下，始终是同一个函数
    const doRename = useCallback(async () => {
        if (!editingId || !editTitle.trim()) {
            return;
        }
        setSaving(true);
        try {
            await chatApi.renameSession(editingId, editTitle.trim());
            onSessionsChanged?.();
        } catch (e: any) {
            console.error(e);
        }
        setSaving(false);
        setEditingId(null);
        setConfirmModal(null);
        //OnSessionChanged的作用是通知父组件重新获取会话列表
    }, [editingId, editTitle, onSessionsChanged]);

    //确认删除会话，每次拿到的会话id和标题都是最新的，所以需要在确认弹窗中使用最新的会话id和标题，不需要用useCallback包围
    const confirmDelete = (s: ChatSession) => {
        setConfirmModal({
            title: '删除会话',
            message: `确认删除会话${s.title || s.conversationId.slice(0, 8)}吗，删除后将无法恢复`,
            confirmLabel: '删除',
            confirmClass: 'bg-red-500 hover:bg-red-600/90',
            onConfirm: async () => {
                try {
                    await chatApi.deleteSession(s.conversationId);
                    if (s.conversationId === activeConversationId) {
                        onSelectSession('');
                    }
                    onSessionsChanged?.();
                } catch (e: any) {
                    console.error(e);
                }
                setConfirmModal(null);
            },
        });
    };

    //确认重置会话
    const handleReset = useCallback(async () => {
        if (!contextMenu) {
            return;
        }
        const id = contextMenu.session.conversationId;
        const s = contextMenu.session;
        setContextMenu(null);
        setConfirmModal({
            title: '重置会话',
            message: `确认重置会话${s.title || s.conversationId.slice(0, 8)}吗，重置后将无法恢复`,
            confirmLabel: '重置',
            confirmClass: 'bg-red-500 hover:bg-red-600/90',
            onConfirm: async () => {
                try {
                    await chatApi.resetSession(id);
                    onSessionsChanged?.();
                } catch (e: any) {
                    console.error(e);
                }
                setConfirmModal(null);
            },
        });
    }, [contextMenu, onSessionsChanged]);

    //处理查看记忆摘要操作
    const handleViewSummary = useCallback(async () => {
        if (!contextMenu) {
            return;
        };
        const cid = contextMenu.session.conversationId;
        setContextMenu(null);
        //先打开弹窗,显示加载状态
        setSummaryModal({ conversationId: cid, data: null, loading: true });
        try {
            const result = await chatApi.getSessionSummary(cid);
            setSummaryModal({ conversationId: cid, data: result, loading: false });
        } catch {
            setSummaryModal({ conversationId: cid, data: null, loading: false });
        }
    }, [contextMenu]);


    //UI渲染：头部、列表、空状态
    return (
        <aside className='h-full glass border-white/10 flex flex-col'>
            <div className='px-4 py-3 border-primary-50/70 backdrop-blur-sm text-primary-600 rounded-xl hover:bg-primary-100/70 transition-all duration-200 font-medium'>
                <h2 className='text-sm font-semibold text-slate-700'>历史会话</h2>
                <button onClick={onNewSession}
                    className='text-xs px-2.5 py-1.5 bg-primary-50/70 backdrop-blur-sm text-primary-600 rounded-xl hover:bg-primary-100/70 transition-all duration-200 font-medium '>
                    + 新建会话
                </button>
            </div>
            <div className='flex-1 overflow-y-auto scroll-smooth'>
                {loading ? (
                    <div className='space-y-1 p-2'>
                        {[1, 2, 3].map((i) => (
                            <div key={i} className='mx-2 my-1 h-16 rounded-xl shimmer-bg' />
                        ))}
                    </div>
                ) : sessions.length === 0 ? (
                    <div className='text-center py-12'>
                        <svg className='h-8 w-8 text-slate-300/50 mx-auto mb-3' fill='none' stroke='currentColor' viewBox='0 24 24 24'>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-sm text-slate-400">暂无会话</p>
                        <p className="text-xs text-slate-300 mt-1">点击新建会话开始聊天</p>
                    </div>
                ) : (
                    //会话列表
                    <ul className='py-1'>
                        {
                            sessions.map((s) => {
                                const isActive = s.conversationId === activeConversationId;
                                return (
                                    <li key={s.conversationId}
                                        onClick={() => onSelectSession(s.conversationId)}
                                        //阻止默认菜单，显示自定义右键菜单
                                        onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, session: s }); }}
                                        onMouseEnter={() => setHoveredId(s.conversationId)}
                                        onMouseLeave={() => setHoveredId(null)}
                                        className={`group mx-2 my-0.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 relative 
                                    ${isActive ? 'bg-white/40 backdrop-blur-sm ring-1 ring-primary-300/30 shadow-md' : 'hover:bg-white/30'}`}>
                                        {editingId === s.conversationId ? (
                                            <div className='flex items-center gap-1.5' data-edit-row>
                                                <input data-edit-input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') { doRename(); } if (e.key === 'Escape') { setOriginalTitle(originalTitle); setEditingId(null); } }}
                                                    className='text-sm flex-1 min-w-0 border border-primary-300/50 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white/60 backdrop-blur-sm'
                                                    //自动聚焦，点击输入框时不触发父元素的 onSelectSession
                                                    autoFocus onClick={(e) => e.stopPropagation()} />
                                                <button onClick={(e) => { e.stopPropagation(); doRename(); }}
                                                    disabled={!editTitle.trim() || editTitle === originalTitle || saving}
                                                    className="shrink-0 px-2 py-1 rounded-lg bg-slate-200 text-slate-500 text-xs font-medium hover:bg-slate-300 
                                                    hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                                                >保存</button>
                                                <button onClick={(e) => { e.stopPropagation(); setEditTitle(originalTitle); setEditingId(null); }}
                                                    disabled={saving}
                                                    className="shrink-0 px-2 py-1 rounded-lg bg-slate-200 text-slate-500 text-xs font-medium hover:bg-slate-300 
                                                hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                                                >取消</button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    {isActive && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0 animate-pulse" />
                                                    )}
                                                    //占据剩余可用空间 会话标题，超出部分截断显示省略号
                                                    <p className={`text-sm truncate flex-1 ${isActive ? 'text-primary-800 font-medium' : 'text-slate-700'}`}>{s.title || s.conversationId.slice(0, 8)}</p>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1 ml-3.5">{s.exchangeCount ?? 0} 轮 · {formatTime(s.editTime)}</p>
                                            </>
                                        )}
                                        {hoveredId === s.conversationId && editingId !== s.conversationId && (
                                            <div className="absolute right-2 top-2 flex items-center gap-1 animate-fade-in">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); startEdit(s); }}
                                                    className="p-1.5 rounded-lg bg-white/80 backdrop-blur-sm border border-white/40 text-slate-400 
                                                hover:text-primary-600 hover:border-primary-200/50 hover:bg-primary-50/80 transition-all duration-200" title="修改名称">
                                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); confirmDelete(s); }}
                                                    className="p-1.5 rounded-lg bg-white/80 backdrop-blur-sm border border-white/40 text-slate-400 hover:text-red-500 hover:border-red-200/50 hover:bg-red-50/80 transition-all duration-200"
                                                    title="删除">
                                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}

                                    </li>
                                )
                            })
                        }
                    </ul>
                )}
            </div>

            {/* 右键菜单 */}
            {contextMenu && (
                <div ref={menuRef} className="fixed z-50 glass-strong rounded-xl py-1.5 w-44 animate-scale-in"
                    style={{ left: contextMenu.x, top: contextMenu.y }}>
                    {/* 修改名称 */}
                    <button onClick={() => { const cs = contextMenu; setContextMenu(null); startEdit(cs.session); }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-white/40 transition-colors duration-150 flex items-center gap-2">
                        <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>修改名称</button>

                    {/* 查看摘要 */}
                    <button onClick={handleViewSummary}
                        className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-white/40 transition-colors duration-150 flex items-center gap-2">
                        <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>查看摘要</button>
                    <div className="border-t border-white/20 my-1" />

                    {/* 清空对话（危险操作，红色文字） */}
                    <button onClick={handleReset}
                        className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50/40 transition-colors duration-150 flex items-center gap-2">
                        <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>清空对话</button>

                    {/* 删除会话（危险操作，红色文字） */}
                    <button onClick={() => { const cs = contextMenu; setContextMenu(null); confirmDelete(cs.session); }}
                        className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50/40 transition-colors duration-150 flex items-center gap-2">
                        <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>删除会话</button>
                </div>
            )}


            {/* 记忆摘要弹窗 */}
            {summaryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setSummaryModal(null)}>
                    <div className="glass-strong rounded-2xl w-[480px] max-h-[70vh] overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
                        {/* 弹窗头部 */}
                        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-slate-800">记忆摘要</h3>
                            <button onClick={() => setSummaryModal(null)} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white/40 transition-colors duration-200">
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* 弹窗内容 */}
                        <div className="p-5 overflow-y-auto max-h-[55vh]">
                            {summaryModal.loading ? (
                                /* 加载状态：显示旋转图标 */
                                <div className="flex items-center justify-center py-8">
                                    <svg className="h-5 w-5 animate-spin text-primary-400" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                </div>
                            ) : summaryModal.data ? (
                                /* 有数据：显示摘要内容 */
                                <div className="space-y-4 text-sm text-slate-600">
                                    <div className="flex gap-4 text-xs text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                                            覆盖 {summaryModal.data.coveredExchangeCount} 轮对话
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                            压缩 {summaryModal.data.compressionCount} 次
                                        </span>
                                        <span>{formatTime(summaryModal.data.editTime)}</span>
                                    </div>
                                    <div className="bg-white/40 backdrop-blur-sm rounded-xl p-4 whitespace-pre-wrap leading-relaxed border border-white/20">
                                        {summaryModal.data.summaryText || '(暂无摘要内容)'}
                                    </div>
                                </div>
                            ) : (
                                /* 无数据：显示空状态提示 */
                                <div className="text-center py-8">
                                    <svg className="h-10 w-10 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-slate-400 text-sm">该会话暂无记忆摘要</p>
                                    <p className="text-slate-300 text-xs mt-1">记忆摘要在对话轮数达到阈值后自动生成</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 确认弹窗（用于删除、清空等危险操作） */}
            {confirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setConfirmModal(null)}>
                    <div className="glass-strong rounded-2xl w-[400px] overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-white/10">
                            <h3 className="text-base font-semibold text-slate-800">{confirmModal.title}</h3>
                        </div>
                        <div className="px-5 py-4">
                            <p className="text-sm text-slate-600">{confirmModal.message}</p>
                        </div>
                        <div className="px-5 py-3 bg-white/20 backdrop-blur-sm flex justify-end gap-2">
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="px-4 py-2 text-sm text-slate-600 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl hover:bg-white/80 transition-all duration-200"
                            >
                                取消
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className={`px-4 py-2 text-sm text-white rounded-xl transition-all duration-200 active:scale-95 backdrop-blur-sm ${confirmModal.confirmClass}`}
                            >
                                {confirmModal.confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </aside >
    );
}

function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    //向下取整，保留分钟级 Math.floor(2.4) = 2
    const diffMin = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}小时前`;
    return date.toLocaleDateString('zh-CN');
}

