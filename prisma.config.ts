import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Same precedence as Next.js: .env.local (local dev DB) wins over .env.
config({ path: [".env.local", ".env"] });

/**
 * The address `prisma migrate` uses (O-13). The app may reach the database through a pooler in
 * transaction mode (Supabase, port 6543), where migrations cannot take their lock, so a Vercel build
 * migrates through MIGRATE_DATABASE_URL (a session connection) when it is set. Read only on Vercel,
 * so a production address in .env never reaches a local migrate.
 */
const migrateUrl = process.env.VERCEL ? process.env.MIGRATE_DATABASE_URL : undefined;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: migrateUrl || env("DATABASE_URL"),
  },
});
