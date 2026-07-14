'use client'

import { adminApi } from "@/lib/admin";
import { getAuth, verifyAuth } from "@/lib/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminPage() {
    const router = useRouter();
    const [docs, setDocs] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [uploading, setUploading] = useState<boolean>(false);

    useEffect(() => {
        verifyAuth().then((ok) => { if (!ok) router.push('/login'); else getDocs(); });
    }, []);

    const getDocs = async () => {
        setLoading(true);
        try {
            const r = await adminApi.listDocument({ keyword: '', pageNo: 1, pageSize: 50 });
            setDocs(r.documents);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) {
            return;
        }
        setUploading(false);
        try {
            const fd = new FormData();
            fd.append('file', f);
            await adminApi.uploadDocument(fd);
            alert('上传成功');
            getDocs();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('确认删除吗？')) {
            return;
        }
        try {
            await adminApi.deleteDocument(id);
            alert('删除成功');
            getDocs();
        } catch (e: any) {
            alert(e.message);
        }
    }

    return (
        <main className='min-h-screen bg-gray-50'>
            <header className='bg-white border-b px-6 py-4 flex justify-between items-center'>
                <div className='flex items-center gap-4'>
                    <Link href='/chat' className='text-blue-500 text-sm'>&larr; 聊天</Link>
                    <h1 className='text-xl font-bold'>文档管理</h1>
                </div>
                <span className='text-sm text-gray-500'>{getAuth().username}</span>
            </header>
            <div className='max-w-4xl mx-auto p-6'>
                <label className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer mb-6 ${uploading ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}>
                    <input type="file" className='hidden' onChange={handleUpload} accept='.pdf,.docx,.doc,.html,.htm,.md,.txt' disabled={loading} />
                    <p></p> <p></p>
                    {uploading ? <p className='text-blue-600'>上传中...</p> : <><p className='text-gray-500 text-lg'>点击上传文档</p><p className='text-gray-400 text-sm'>PDF, DOCX, HTML, MD, TXT</p></>}
                </label>
                {loading ? <p className='text-center text-gray-400 py-8'>加载中...</p> : docs.length===0 ? <p className='text-center text-gray-400 py-8'>暂无文档</p> : (
                    <div className='space-y-2'>
                        {docs.map((doc: any) => (
                            <div key={doc.documentId} className='bg-white rounded-xl border p-4 flex justify-between items-center'>
                                <div><p className='font-medium'>{doc.documentName}</p><p className="text-sm text-gray-400">{doc.fileType?.toUpperCase()}· {(doc.fileSize / 1024).toFixed(1)}</p></div>
                                <button onClick={() => handleDelete(doc.documentId)} className='text-sm text-red-500 hover:text-red-600'>删除</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    )
}