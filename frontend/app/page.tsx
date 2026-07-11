'use client'

import { authApi } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";



export default function LoginPage() {
  const router = useRouter();
  const [isReg, setIsReg] = useState(false);
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authApi.isLoggedIn()) router.replace('/chat');
  }, [router]);

  const submit = async () => {
    if (!u || !p) {
      setError('用户名或密码不能为空');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (isReg) {
        await authApi.register(u, p);
        router.push('/chat');
      } else {
        await authApi.login(u, p);
        router.push('/chat');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
      <div className='bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm'>
        <h1 className='text-2xl font-bold text-center mb-2'>Agent-Q</h1>
        <p className='text-sm text-gray-500 text-center mb-2'>{isReg ? '注册账号' : '登录账号'}</p>
        {error && <div className='mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600'>{error}</div>}
        <div className='space-y-4'>
          <input value={u} onChange={(e) => setU(e.target.value)} placeholder='用户名' className='w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500/20' />
          <input value={p} onChange={(e) => setP(e.target.value)} placeholder='密码' className='w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-5000/20' />
          <button onClick={submit} disabled={loading} className='w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:opacity-50'>
            {loading ? '处理中...' : isReg ? '注册账号' : '登录账号'}
          </button>
        </div>
        <div className='mt-4 text-center'>
          <button onClick={() => { setIsReg(!isReg); setError('') }} className='text-sm text-blue-500 hover:text-blue-600'>{isReg ? '已有账号？登录' : '没有账号？注册'}</button>
        </div>
      </div>
    </main>
  )
}