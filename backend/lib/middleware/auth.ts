import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyToken } from "../service/auth/jwt";

export function authenticateAdmin(request: NextRequest): { username: string, role: string } | NextResponse {
    const authHeader = request.headers.get('Authorization');
    const token = extractToken(authHeader);
    if (!token) {
        return NextResponse.json({ error: 'token未授权' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (payload === null) {
        return NextResponse.json({ error: 'token无效或过期' }, { status: 401 });
    }
    return { username: payload.username, role: payload.role };
}