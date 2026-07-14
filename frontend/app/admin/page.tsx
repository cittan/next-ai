'use client'

import { adminApi } from "@/lib/admin";
import { verifyAuth } from "@/lib/auth";
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
        } catch(e: any) {
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
        } catch(e: any) {
            alert(e.message);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleDelete = async (id: number) => {
        if(!confirm('确认删除吗？')){
            return;
        }
        try {
            await adminApi.deleteDocument(id);
            alert('删除成功');
            getDocs();
        } catch(e: any) {
            alert(e.message);
        }
    }

    return (
        <main>
            <header>
                <div></div>
                <span></span>
            </header>
            <div>
                
            </div>
        </main>
    )
}