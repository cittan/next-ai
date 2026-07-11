
//泛型为通用，用于返回任意类型的响应，避免使用any
async function request<T>(
    url: string,
    options: { method?: string; body?: any; headers?: Record<string, string> } = {},
): Promise<T> {
    const { method = "GET", body, headers } = options;
    const header: Record<string, string> = { ...headers };
    if(body) {
        header["Content-Type"] = "application/json";
    }
    //检测当前是否是浏览器环境，如果是浏览器环境，才添加Authorization头
    const token = typeof window !== "undefined" ? window.localStorage.getItem("token") : null;
    if(token) {
        header["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(url, {method, body: body ? JSON.stringify(body) : undefined, headers: header});
    if(!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `HTTP ${res.status}`); 
    }
    //json方法返回一个Promise
    return res.json();
}

//做参数转发，其中是两个key，值为箭头函数，不是类型定义
export const api = {
    get: <T>(url: string, config: { headers?: Record<string, string> } = {}) => request<T>(url, { method: "GET", ...config }),
    post: <T>(url: string, body?: any, config: { headers?: Record<string, string> } = {}) => request<T>(url, { method: "POST", body: body, ...config }),
}

