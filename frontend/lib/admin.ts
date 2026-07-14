/**
 * 
 * @param url 
 * @param opts
 * {method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ key: 'value' })} 
 */
const base = (url: string, opts: RequestInit) => {
    const token = localStorage.getItem('token');
    const headers: any = { ...opts.headers };
    if(token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...opts, headers }).then(r => r.ok ? r.json() : r.json().then(error => {throw new Error(error)}));
}

export const adminApi = {
    uploadDocument: (fd: FormData) => base('/api/manage/document/upload', { method: 'POST', body: fd }),
    listDocument: (p: { keyword: string, pageNo: number, pageSize: number }) => {
        const params = new URLSearchParams({
            keyword: p.keyword,
            page: p.pageNo.toString(),
            pageSize: p.pageSize.toString()
        });
        return base(`/api/manage/document/page/query?${params}`, { method: 'GET' });
    },
    deleteDocument: (id: number) => base(`/api/manage/document/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: id }) }),
}