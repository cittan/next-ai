import { defineConfig } from 'prisma/config';
import { config } from 'dotenv';
config({ path: '.env' });

export default defineConfig({
  schema: 'prisma/db-knowledge/schema.prisma',
  datasource: {
    url: process.env.KNOWLEDGE_DB_URL,
  },
});
