import { Client as MinioClient } from 'minio';
import { config } from '../config';



let _c: MinioClient | null = null;
export function getMinio(): MinioClient {
    if(!_c) {
        _c = new MinioClient({
            endPoint: config.minio.endpoint.replace(/https?:\/\//,''),
            port: 9000,
            useSSL: false,
            accessKey: config.minio.accessKey,
            secretKey: config.minio.secretKey,
        })
        _c.bucketExists(config.minio.bucketName).then(e => {
            if(!e){
                _c!.makeBucket(config.minio.bucketName, 'us-east-1');
            }
        }).catch (() => {});
    }
    return _c;
}

export async function downloadFromMinio(objectName: string): Promise<Buffer> {
    const client = getMinio();
    const chunks: Buffer[] = [];
    const stream = await client.getObject(config.minio.bucketName, objectName);
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
} 