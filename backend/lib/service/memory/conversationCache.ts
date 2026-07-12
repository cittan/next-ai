import { getRedis } from "@/lib/db/redis";



export const conversationCache = {
    async get(key: string): Promise<any | null> {
        try {
            const v = await getRedis().get(`conv:${key}`);
            return v ? JSON.parse(v) : null;
        } catch {
            return null;
        }
    },

    async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
        try{
            await getRedis().set(`conv:${key}`, JSON.stringify(value), "EX", ttlSeconds);
        } catch {
            return undefined;
        }
    },

    async invalidate(key: string): Promise<void> {
        try{
            await getRedis().del(`conv:${key}`);
        } catch {
            return undefined;
        }
    }
}