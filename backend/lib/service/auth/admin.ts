import { getBusinessPrisma } from "@/lib/db/prisma-business";
import { config } from '../../config';
import bcrypt from 'bcryptjs';
import { JwtPayload, signToken } from "./jwt";



const saltRounds = 10;

export async function adminLogin(username: string, password: string) {
    const prisma = getBusinessPrisma();
    const count = await prisma.adminUser.count();
    if (count === 0) {
        //若查询管理员用户为空，则第一次创建默认管理员用户，并把存入数据库的密码进行bcrypt hash
        await prisma.adminUser.upsert({
            where: {
                username: config.admin.username,
            },
            update: {},
            create: {
                username: config.admin.username,
                passwordHash: await bcrypt.hash(config.admin.password, saltRounds),
                role: 'admin'
            }
        })
    }
    const user = await prisma.adminUser.findUnique({
        where: {
            username,
        }
    })
    if (!user) {
        return null
    }
    if (!await bcrypt.compare(password, user.passwordHash)) {
        return null
    }
    const payload: JwtPayload = {
        userId: user.id,
        username: user.username,
        role: user.role,
    }
    return {
        token: signToken(payload),
        user: {
            userId: user.id,
            username: user.username,
            role: user.role,
        }
    }
}

export async function adminRegister(username: string, password: string) {
    const prisma = getBusinessPrisma();
    const user = await prisma.adminUser.findUnique({
        where: {
            username,
        }
    })
    if (user) {
        return null;
    }
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const result = await prisma.adminUser.create({
        data: {
            username,
            passwordHash,
            role: 'admin'
        }
    })
    return result;
}