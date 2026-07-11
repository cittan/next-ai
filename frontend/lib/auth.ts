import { api } from "./client";

const state = {
    token: typeof window !== 'undefined' ? localStorage.getItem('token') : null as string | null,
    username: (typeof window !== 'undefined') ? localStorage.getItem('username') : null as string | null, isAdmin: false
}

export function getAuth() {
    return { ...state };
}

function saveAuth(token: string, username: string) {
    state.token = token;
    state.username = username;
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
}

export function logout() {
    state.token = null;
    state.username = null;
    state.isAdmin = false;
    localStorage.removeItem('token');
    localStorage.removeItem('username');
}

export async function verifyToken() {
    if(!state.token) {
        return false;
    }
    try {
        const u = await api.get<{role: string}>('/api/admin/auth/me');
        state.isAdmin = u.role === 'admin';
        return true;
    } catch {
        logout();
        return false;
    }
}

export const authApi = {
    async login(username: string, password: string) {
        const r = await api.post<{token: string, user: {username: string, role: string}}>('/api/admin/auth/login', {username, password});
        saveAuth(r.token, r.user.username);
        return r;
    },
    async register(username: string, password: string) {
        const r = await api.post<{token: string, user: {username: string, role: string}}>('/api/admin/auth/register', {username, password});
        saveAuth(r.token, r.user.username);
        return r;
    }
}