'use client'

import { adminApi } from "@/lib/admin";
import { getAuth, verifyAuth } from "@/lib/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PARSE_STATES: Record<number, string> = { 1: '待解析', 2: '解析中', 3: '解析成功', 4: '解析失败' };
const INDEX_STATES: Record<number, string> = { 1: '待构建', 2: '构建中', 3: '构建成功', 4: '构建失败' };
const STRATEGY_STATES: Record<number, string> = { 1: '待策略', 2: '已推荐', 3: '已确认', 4: '已废弃', 5: '已执行' };

function StatusBadge({ status, labels, error, okValues = [3], runningValues = [2] }: {
    status: number;
    labels: Record<number, string>;
    error?: string;
    okValues?: number[];
    runningValues?: number[];
}) {
    const label = labels[status] || '未知';
    const isError = status === 4;
    const isOk = okValues.includes(status);
    const isRunning = runningValues.includes(status);

    return (
        <span
            className={`text-xs px-2.5 py-1.5 rounded-xl font-medium inline-flex items-center gap-1 ${isError
                ? 'bg-red-50/70 text-red-500'
                : isOk
                    ? 'bg-emerald-50/70 text-emerald-600'
                    : isRunning
                        ? 'bg-blue-50/70 text-blue-500'
                        : 'bg-white/30 text-slate-500'
                }`}
            title={isError ? error : undefined}
        >
            {isRunning && (
                <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            )}
            {label}
        </span>
    );
}

export default function AdminPage() {
    const router = useRouter();
    const [docs, setDocs] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [uploading, setUploading] = useState<boolean>(false);
    const [keyword, setKeyword] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'documents' | 'knowledge'>('documents');
    const [scopes, setScopes] = useState<any[]>([]);
    const [topics, setTopics] = useState<any[]>([]);
    const [selectedScopeCode, setSelectedScopeCode] = useState<string>('');
    const [editingScope, setEditingScope] = useState<any>(null);
    const [editingTopic, setEditingTopic] = useState<any>(null);

    useEffect(() => {
        verifyAuth().then((ok) => { if (!ok) router.push('/login'); else loadDocuments(); });
    }, []);

    const loadScopes = async () => {
        try {
            const data = await adminApi.listKnowledgeScopes();
            setScopes(data);
        } catch (e: any) {
            console.error('加载知识范围失败:', e);
        }
    };

    const loadTopics = async (scopeCode?: string) => {
        try {
            const data = await adminApi.listKnowledgeTopics(scopeCode);
            setTopics(data);
        } catch (e: any) {
            console.error('加载知识主题失败:', e);
        }
    };

    const handleSaveScope = async (data: any) => {
        try {
            await adminApi.saveKnowledgeScope(data);
            setEditingScope(null);
            loadScopes();
        } catch (e: any) {
            alert('保存失败: ' + e.message);
        }
    };

    const handleDeleteScope = async (scopeCode: string) => {
        if (!confirm('确认删除该知识范围？')) return;
        try {
            await adminApi.deleteKnowledgeScope(scopeCode);
            loadScopes();
        } catch (e: any) {
            alert('删除失败: ' + e.message);
        }
    };

    const handleSaveTopic = async (data: any) => {
        try {
            await adminApi.saveKnowledgeTopic(data);
            setEditingTopic(null);
            loadTopics(selectedScopeCode);
        } catch (e: any) {
            alert('保存失败: ' + e.message);
        }
    };

    const handleDeleteTopic = async (topicCode: string) => {
        if (!confirm('确认删除该知识主题？')) return;
        try {
            await adminApi.deleteKnowledgeTopic(topicCode);
            loadTopics(selectedScopeCode);
        } catch (e: any) {
            alert('删除失败: ' + e.message);
        }
    };

    const loadDocuments = async () => {
        setLoading(true);
        try {
            const r = await adminApi.listDocument({ keyword, pageNo: 1, pageSize: 50 });
            setDocs(r.items);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', f);
            await adminApi.uploadDocument(fd);
            alert('上传成功');
            loadDocuments();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('确认删除吗？')) return;
        try {
            await adminApi.deleteDocument(id);
            alert('删除成功');
            loadDocuments();
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleBuildIndex = async (doc: any) => {
        try {
            await adminApi.buildDocumentIndex(doc.id || doc.documentId);
            alert('索引构建完成');
            loadDocuments();
        } catch (err: any) {
            alert('索引构建失败: ' + (err.message || '未知错误'));
        }
    };

    return (
        <main className='min-h-screen bg-gray-50'>
            <header className='bg-white border-b px-6 py-4 flex justify-between items-center'>
                <div className='flex items-center gap-4'>
                    <Link href='/chat' className='text-blue-500 text-sm'>&larr; 聊天</Link>
                    <h1 className='text-xl font-bold'>文档管理</h1>
                    <div className="flex items-center gap-1 ml-2">
                        <button
                            onClick={() => setActiveTab('documents')}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${activeTab === 'documents' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            文档管理
                        </button>
                        <button
                            onClick={() => { setActiveTab('knowledge'); loadScopes(); }}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${activeTab === 'knowledge' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            知识分类
                        </button>
                    </div>
                </div>
                <span className='text-sm text-gray-500'>{getAuth().username}</span>
            </header>
            <div className='max-w-6xl mx-auto p-6'>
                {activeTab === 'knowledge' && (
                    <div className="px-6 pt-4 pb-6">
                        <div className="grid grid-cols-2 gap-6">
                            {/* 左侧：知识范围列表 */}
                            <div className="bg-white rounded-2xl p-5 border">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-gray-700">知识范围</h3>
                                    <button
                                        onClick={() => setEditingScope({ scopeCode: '', scopeName: '', description: '', isNew: true })}
                                        className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                                    >
                                        + 新增
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {scopes.map((scope: any) => (
                                        <div key={scope.scopeCode} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                                            <div>
                                                <p className="font-medium text-sm">{scope.scopeName}</p>
                                                <p className="text-xs text-gray-400">{scope.scopeCode}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => { setSelectedScopeCode(scope.scopeCode); loadTopics(scope.scopeCode); }}
                                                    className="text-xs text-blue-500 hover:text-blue-600"
                                                >
                                                    查看主题
                                                </button>
                                                <button
                                                    onClick={() => setEditingScope({ ...scope, isNew: false })}
                                                    className="text-xs text-gray-500 hover:text-gray-600"
                                                >
                                                    编辑
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteScope(scope.scopeCode)}
                                                    className="text-xs text-red-500 hover:text-red-600"
                                                >
                                                    删除
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {editingScope && (
                                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                        <h4 className="text-sm font-medium mb-2">{editingScope.isNew ? '新增知识范围' : '编辑知识范围'}</h4>
                                        <input
                                            type="text"
                                            placeholder="范围编码"
                                            value={editingScope.scopeCode}
                                            onChange={(e) => setEditingScope({ ...editingScope, scopeCode: e.target.value })}
                                            disabled={!editingScope.isNew}
                                            className="w-full px-3 py-2 text-sm border rounded mb-2"
                                        />
                                        <input
                                            type="text"
                                            placeholder="范围名称"
                                            value={editingScope.scopeName}
                                            onChange={(e) => setEditingScope({ ...editingScope, scopeName: e.target.value })}
                                            className="w-full px-3 py-2 text-sm border rounded mb-2"
                                        />
                                        <input
                                            type="text"
                                            placeholder="描述"
                                            value={editingScope.description}
                                            onChange={(e) => setEditingScope({ ...editingScope, description: e.target.value })}
                                            className="w-full px-3 py-2 text-sm border rounded mb-2"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSaveScope(editingScope)}
                                                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                                            >
                                                保存
                                            </button>
                                            <button
                                                onClick={() => setEditingScope(null)}
                                                className="px-3 py-1.5 text-sm bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                                            >
                                                取消
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 右侧：知识主题列表 */}
                            <div className="bg-white rounded-2xl p-5 border">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-gray-700">
                                        知识主题 {selectedScopeCode ? `— ${selectedScopeCode}` : ''}
                                    </h3>
                                    {selectedScopeCode && (
                                        <button
                                            onClick={() => setEditingTopic({ topicCode: '', topicName: '', scopeCode: selectedScopeCode, description: '', isNew: true })}
                                            className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                                        >
                                            + 新增
                                        </button>
                                    )}
                                </div>
                                {!selectedScopeCode ? (
                                    <p className="text-center text-gray-400 py-8">请先选择知识范围</p>
                                ) : (
                                    <div className="space-y-2">
                                        {topics.map((topic: any) => (
                                            <div key={topic.topicCode} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                                                <div>
                                                    <p className="font-medium text-sm">{topic.topicName}</p>
                                                    <p className="text-xs text-gray-400">{topic.topicCode}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setEditingTopic({ ...topic, isNew: false })}
                                                        className="text-xs text-gray-500 hover:text-gray-600"
                                                    >
                                                        编辑
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTopic(topic.topicCode)}
                                                        className="text-xs text-red-500 hover:text-red-600"
                                                    >
                                                        删除
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {editingTopic && (
                                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                        <h4 className="text-sm font-medium mb-2">{editingTopic.isNew ? '新增知识主题' : '编辑知识主题'}</h4>
                                        <input
                                            type="text"
                                            placeholder="主题编码"
                                            value={editingTopic.topicCode}
                                            onChange={(e) => setEditingTopic({ ...editingTopic, topicCode: e.target.value })}
                                            disabled={!editingTopic.isNew}
                                            className="w-full px-3 py-2 text-sm border rounded mb-2"
                                        />
                                        <input
                                            type="text"
                                            placeholder="主题名称"
                                            value={editingTopic.topicName}
                                            onChange={(e) => setEditingTopic({ ...editingTopic, topicName: e.target.value })}
                                            className="w-full px-3 py-2 text-sm border rounded mb-2"
                                        />
                                        <input
                                            type="text"
                                            placeholder="描述"
                                            value={editingTopic.description}
                                            onChange={(e) => setEditingTopic({ ...editingTopic, description: e.target.value })}
                                            className="w-full px-3 py-2 text-sm border rounded mb-2"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSaveTopic(editingTopic)}
                                                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                                            >
                                                保存
                                            </button>
                                            <button
                                                onClick={() => setEditingTopic(null)}
                                                className="px-3 py-1.5 text-sm bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                                            >
                                                取消
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'documents' && (
                    <>
                        <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && loadDocuments()}
                                placeholder="搜索文档..."
                                className="pl-9 pr-3 py-2 bg-white/40 backdrop-blur-sm border border-white/30 rounded-xl text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400/50 focus:bg-white/60 transition-all duration-300"
                            />
                        </div>
                        <button
                            onClick={() => loadDocuments()}
                            className="px-3 py-2 text-sm bg-white/40 backdrop-blur-sm border border-white/30 text-slate-600 rounded-xl hover:bg-white/60 transition-all duration-300"
                        >
                            刷新
                        </button>
                    </div>
                    <label className={`block border-2 border-dashed rounded-xl px-4 py-2 text-center cursor-pointer ${uploading ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}>
                        <input type="file" className='hidden' onChange={handleUpload} accept='.pdf,.docx,.doc,.html,.htm,.md,.txt' disabled={loading} />
                        {uploading ? <span className='text-blue-600 text-sm'>上传中...</span> : <span className='text-gray-500 text-sm'>上传文档</span>}
                    </label>
                </div>

                {loading ? <p className='text-center text-gray-400 py-8'>加载中...</p> : docs.length === 0 ? <p className='text-center text-gray-400 py-8'>暂无文档</p> : (
                    <div className='bg-white rounded-xl border overflow-hidden'>
                        <table className='w-full text-sm'>
                            <thead className='bg-gray-50 border-b'>
                                <tr>
                                    <th className='px-5 py-3 text-left font-medium text-gray-600'>文档名称</th>
                                    <th className='px-5 py-3 text-left font-medium text-gray-600'>解析状态</th>
                                    <th className='px-5 py-3 text-left font-medium text-gray-600'>策略状态</th>
                                    <th className='px-5 py-3 text-left font-medium text-gray-600'>索引状态</th>
                                    <th className='px-5 py-3 text-left font-medium text-gray-600'>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {docs.map((doc: any) => (
                                    <tr key={doc.documentId} className='border-b hover:bg-gray-50'>
                                        <td className="px-5 py-3.5">
                                            <p className='font-medium'>{doc.documentName}</p>
                                            <p className="text-xs text-gray-400">{doc.fileType?.toUpperCase()} · {(doc.fileSize / 1024).toFixed(1)} KB</p>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <StatusBadge status={doc.parseStatus} labels={PARSE_STATES} error={doc.parseErrorMsg} />
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <StatusBadge status={doc.strategyStatus} labels={STRATEGY_STATES} okValues={[2, 3, 5]} runningValues={[]} />
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <StatusBadge status={doc.indexStatus} labels={INDEX_STATES} />
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                {doc.parseStatus === 3 && (
                                                    doc.indexStatus === 2 ? (
                                                        <span className="text-xs px-2.5 py-1.5 bg-blue-50/70 text-blue-500 rounded-xl font-medium inline-flex items-center gap-1">
                                                            <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                            </svg>
                                                            构建中
                                                        </span>
                                                    ) : doc.indexStatus === 3 ? (
                                                        <span className="text-xs px-2.5 py-1.5 bg-emerald-50/70 text-emerald-600 rounded-xl font-medium">已构建</span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleBuildIndex(doc)}
                                                            className="text-xs px-2.5 py-1.5 bg-blue-50/70 backdrop-blur-sm text-blue-600 rounded-xl hover:bg-blue-100/70 transition-all duration-200 font-medium"
                                                        >
                                                            构建索引
                                                        </button>
                                                    )
                                                )}
                                                <button onClick={() => handleDelete(doc.documentId)} className='text-xs text-red-500 hover:text-red-600'>删除</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                    </>
                )}
            </div>
        </main>
    )
}
