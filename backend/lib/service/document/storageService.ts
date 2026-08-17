import { config } from '../../config';
import { getMinio } from '../../db/minio';


export function buildObjectName(objectPrefix: string, fileName: string, timestamp = Date.now()): string {
    return `${objectPrefix.replace(/\/+$/, '')}/${timestamp}_${fileName}`;
}

export async function uploadFile(buffer: Buffer, fileName: string, mimeType: string) {
    // Keep the persisted object name identical to the object uploaded to MinIO so compensation can remove it.
    const objectName = buildObjectName(config.minio.objectPrefix, fileName);
    await getMinio().putObject(config.minio.bucketName, objectName, buffer, buffer.length, { contentType: mimeType });
    return objectName;
}

//获取文件下载URL,有效期7天
export async function getDownloadUrl(objectName: string): Promise<string> {
    return getMinio().presignedGetObject(config.minio.bucketName, objectName, 7 * 24 * 60 * 60);
}

export async function deleteFile(objectName: string) {
    await getMinio().removeObject(config.minio.bucketName, objectName);
}