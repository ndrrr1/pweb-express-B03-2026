import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const url = process.env.DATABASE_URL_UNPOOLED?.trim();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'node --import tsx prisma/seed.ts' },
  // Generate tetap dapat berjalan sebelum koneksi diisi. Migrasi diperiksa oleh check:env.
  ...(url ? { datasource: { url } } : {}),
});
