// Runs `prisma migrate deploy` only for Vercel production builds, so the schema
// is migrated before the new code goes live. Preview and local builds skip it:
// they may share the production DATABASE_URL and must never migrate it.
import { execSync } from "node:child_process";

if (process.env.VERCEL_ENV === "production") {
  console.log("[build] Production build: applying pending migrations");
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
} else {
  console.log(`[build] Skipping migrations (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"})`);
}
