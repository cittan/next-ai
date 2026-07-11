import { NextRequest, NextResponse } from "next/server";
import { AdminLoginOrRegisterRequest } from "@/lib/models/admin";
import { adminRegister } from "@/lib/service/auth/admin";

export async function POST(r: NextRequest) {
    const { username, password } = await r.json() as AdminLoginOrRegisterRequest;
    if (!username || !password) {
        return NextResponse.json({ error: '用户名或密码不能为空' }, { status: 400 });
    }
    if (password.length < 6) {
        return NextResponse.json({ error: '密码至少6位' }, { status: 400 });
    }
    const result = await adminRegister(username, password);
    if (!result) {
        return NextResponse.json({ error: '用户名已存在' }, { status: 400 });
    }
    return NextResponse.json({ message: '注册成功' });
}