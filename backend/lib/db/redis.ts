import { config } from '../config';
import { Redis } from 'ioredis';


let _redis: Redis | null = null;
export function getRedis(): Redis {
    if(!_redis) {
        _redis = new Redis({
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password || undefined,
            db: config.redis.db,
            maxRetriesPerRequest: 3,
        });
        _redis.on('error', e => console.error('[Redis] Error:', e.message));
    }
    return _redis;
}