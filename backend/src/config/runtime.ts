import 'dotenv/config';
export { config as legacyConfig } from '../../lib/config';

function positiveIntegerFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

export const runtimeConfig = {
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  port: Number(process.env.PORT ?? 3000),
  maxUploadBytes: positiveIntegerFromEnv('MAX_UPLOAD_BYTES', 20 * 1024 * 1024),
};
