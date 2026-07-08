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
    const doRename = useCallback(async() => {
        if(!editingId || !editTitle.trim()) {
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
    }, [editingId,editTitle,onSessionsChanged]);

    //确认删除会话，每次拿到的会话id和标题都是最新的，所以需要在确认弹窗中使用最新的会话id和标题，不需要用useCallback包围
    const confirmDelete = (s: ChatSession) => {
        setConfirmModal({
            title: '删除会话',
            message: `确认删除会话${s.title || s.conversationId.slice(0,8)}吗，删除后将无法恢复`,
            confirmLabel: '删除',
            confirmClass: 'bg-red-500 hover:bg-red-600/90',
            onConfirm: async () => {
                try {
                    await chatApi.deleteSession(s.conversationId);
                    if(s.conversationId === activeConversationId) {
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
        if(!contextMenu) {
            return;
        }
        const id = contextMenu.session.conversationId;
        const s = contextMenu.session;
        setContextMenu(null);
        setConfirmModal({
            title: '重置会话',
            message: `确认重置会话${s.title || s.conversationId.slice(0,8)}吗，重置后将无法恢复`,
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
    }, [contextMenu,onSessionsChanged]);

    //处理查看记忆摘要操作
    const handleViewSummary = useCallback(async () => {
        if(!contextMenu) {
            return;
        };
        const cid = contextMenu.session.conversationId;
        setContextMenu(null);
        //先打开弹窗,显示加载状态
        setSummaryModal({conversationId: cid, data: null, loading: true});
        try {
            const result = await chatApi.getSessionSummary(cid);
            setSummaryModal({conversationId: cid, data: result, loading: false});
        } catch {
            setSummaryModal({conversationId: cid, data: null, loading: false});
        }
    }, [contextMenu]);


    //UI渲染：头部、列表、空状态
    return (
        <aside>
            <div>
                <h2>历史会话</h2>
                <button>
                    + 新建会话
                </button>
            </div>
            <div>
                {loading ? (
                    <div>
                        {[1,2,3].map((i) => (
                            <div key={i} />
                        ))}
                    </div>
                ) : sessions.length === 0 ? (
                    <div>
                        <svg>
                            <path />
                        </svg>
                        <p>暂无会话</p>
                        <p>点击新建会话开始聊天</p>
                    </div>
                ) : (
                    <ul>
                        {
                            sessions.map((s) => {
                                const isActive = s.conversationId === activeConversationId;
                                return (
                                    <li key={s.conversationId}>
                                        {editingId === s.conversationId ? (
                                            <div>
                                                <input type="text" />
                                                <button>保存</button>
                                                <button>取消</button>
                                            </div>
                                        ) : (
                                            <>
                                                <div>
                                                    {isActive && (
                                                        <span />
                                                    )}
                                                    <p>{s.title || s.conversationId.slice(0,8)}</p>
                                                </div>
                                            </>
                                        )}
                                        {hoveredId === s.conversationId && editingId !== s.conversationId && (
                                            <div>
                                                <button>
                                                    <svg>
                                                        <path />
                                                    </svg>
                                                </button>
                                                <button>
                                                    <svg>
                                                        <path />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                        
                                    </li>
                                )
                            })
                        }
                    </ul>
                ) }
            </div>



        </aside>
    )

}

