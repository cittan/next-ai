import { AdminLoginRequest } from "@/lib/models/admin";
import { adminLogin } from "@/lib/service/auth/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(r: NextRequest) {
    const { username, password } = await r.json() as AdminLoginRequest;
    if(!username || !password) {
        return NextResponse.json({error: '用户名或密码不能为空'});
    }
    const result = await adminLogin(username, password);
    if(!result) {
        return NextResponse.json({error: '用户名或密码错误'}, {status:401});
    }
    return NextResponse.json(result);
}
