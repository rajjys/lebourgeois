import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Same precedence as Next.js: .env.local (local dev DB) wins over .env.
config({ path: [".env.local", ".env"] });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
