import { config } from '../../config';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
    userId: number;
    username: string;
    role: string;
}

export function signToken(payload: JwtPayload) {
    return jwt.sign(payload, config.admin.tokenSecret , { expiresIn: config.admin.tokenExpireMinutes * 60 });
}   

export function verifyToken(token: string){
    try{
        return jwt.verify(token, config.admin.tokenSecret) as JwtPayload;
    } catch {
        return null;
    }
}

export function extractToken(authHeader: string | null): string | null {
    if(!authHeader) {
        return null;
    }
    const parts = authHeader.split(' ');
    if(parts.length !== 2 || parts[0] !== 'Bearer'){
        return null;
    }
    return parts[1];
}