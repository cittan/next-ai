import { config } from "@/lib/config";
import { getMinio } from "@/lib/db/minio";


export async function uploadFile(buffer: Buffer, fileName: string, mimeType: string) {
    // 实现文件上传逻辑
    const objectName = `${config.minio.objectPrefix}/${Date.now()}_${fileName}`;
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