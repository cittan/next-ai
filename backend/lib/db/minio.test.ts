// 必须在所有 import 之前加载环境变量，因为 config 模块在 import 时就会执行 loadConfig()
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getMinio, downloadFromMinio } from './minio';
import { config } from '../config';

async function runTests() {
  console.log('=== MinIO 客户端测试 ===');

  // 测试 1：单例模式
  const m1 = getMinio();
  const m2 = getMinio();
  console.assert(m1 === m2, '应该返回同一个 MinIO 实例');
  console.log('✓ MinIO 单例模式正常');

  // 测试 2：存储桶存在性检查
  try {
    const exists = await m1.bucketExists(config.minio.bucketName);
    console.log('✓ 存储桶检查成功，存在:', exists);
  } catch (err: any) {
    console.error('✗ 存储桶检查失败:', err.message);
    console.log('提示：请检查 MinIO 服务是否启动，以及 MINIO_ENDPOINT 等环境变量配置');
    process.exit(1);
  }

  // 测试 3：上传测试文件
  const testObjectName = 'test/super-agent-test-' + Date.now() + '.txt';
  const testContent = Buffer.from('Hello MinIO from Super Agent!');
  
  try {
    await m1.putObject(config.minio.bucketName, testObjectName, testContent);
    console.log('✓ MinIO 上传成功:', testObjectName);
  } catch (err: any) {
    console.error('✗ MinIO 上传失败:', err.message);
    process.exit(1);
  }

  // 测试 4：下载测试文件
  try {
    const downloaded = await downloadFromMinio(testObjectName);
    console.assert(downloaded.toString() === testContent.toString(), '下载内容应该与上传内容一致');
    console.log('✓ MinIO 下载成功，内容:', downloaded.toString());
  } catch (err: any) {
    console.error('✗ MinIO 下载失败:', err.message);
  }

  // 测试 5：删除测试文件
  try {
    await m1.removeObject(config.minio.bucketName, testObjectName);
    console.log('✓ MinIO 删除成功');
  } catch (err: any) {
    console.error('✗ MinIO 删除失败:', err.message);
  }

  console.log('\n所有测试通过！');
}

runTests();