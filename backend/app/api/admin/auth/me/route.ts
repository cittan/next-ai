import { authenticateAdmin } from "@/lib/middleware/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(r: NextRequest){
    const auth = authenticateAdmin(r);
    if(auth instanceof NextResponse){
        return auth;
    }
    return NextResponse.json({username: auth.username, role: auth.role});
}