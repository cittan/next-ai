import 'dotenv/config';
export { config as legacyConfig } from '../../lib/config';

export const runtimeConfig = {
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  port: Number(process.env.PORT ?? 3000),
};
