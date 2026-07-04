import { defineConfig } from 'prisma/config';
import { config } from 'dotenv';
config({ path: '.env' });

export default defineConfig({
  schema: 'prisma/db-business/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
