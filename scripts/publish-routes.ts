/**
 * Sets draft routes to "Publiée" in one go (owner, 2026-11-02: "run a bulk script to publish the
 * prod routes"). The same switch as the route page's status in the back office, logged in each
 * route's history. Publishing alone does not index a page: it also needs an airline published on
 * it or an airport notice (lib/routePages.ts, hasContent), so empty routes stay noindex.
 *
 *   npx tsx scripts/publish-routes.ts                          local, preview
 *   npx tsx scripts/publish-routes.ts --production             production, preview
 *   npx tsx scripts/publish-routes.ts --production --apply     production
 * --tier=1 narrows to one priority tier (default: every draft route).
 */
import { readFileSync } from "node:fs";
import { config, parse } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const production = process.argv.includes("--production");
const apply = process.argv.includes("--apply");
const tier = arg("tier") ? Number(arg("tier")) : undefined;
if (tier !== undefined && !Number.isInteger(tier)) throw new Error("--tier must be a number");

let url: string | undefined;
if (production) url = parse(readFileSync(".env")).DATABASE_URL;
else {
  config({ path: [".env.local"], quiet: true });
  url = process.env.DATABASE_URL;
  if (url && !["localhost", "127.0.0.1", "::1"].includes(new URL(url).hostname)) throw new Error("Not a local database; pass --production");
}
if (!url) throw new Error("DATABASE_URL is not set");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function main() {
  const targets = await prisma.route.findMany({
    where: { status: "DRAFT", ...(tier !== undefined ? { tier } : {}) },
    include: {
      origin: { select: { status: true } },
      destination: { select: { status: true } },
      _count: { select: { airlines: { where: { isPublished: true, airline: { isPublished: true } } } } },
    },
    orderBy: [{ tier: "asc" }, { slug: "asc" }],
  });
  const all = await prisma.route.groupBy({ by: ["status"], _count: true });
  console.log(`${new URL(url!).hostname} · ${apply ? "APPLY" : "preview"}${tier !== undefined ? ` · tier ${tier}` : ""}`);
  console.log(`Routes now: ${all.map((g) => `${g.status} ${g._count}`).join(", ")}`);
  let indexable = 0;
  for (const r of targets) {
    const content = r._count.airlines > 0 || r.origin.status !== "OPEN" || r.destination.status !== "OPEN";
    if (content) indexable++;
    const why = r._count.airlines > 0 ? `${r._count.airlines} published airline(s)` : content ? "airport notice" : "nothing to show, stays noindex";
    console.log(`  P${r.tier} ${r.slug}: ${why}`);
  }
  console.log(`${targets.length} draft routes to publish; ${indexable} become indexable now, ${targets.length - indexable} stay noindex until an airline is published on them.`);
  if (!apply || targets.length === 0) return;
  await prisma.$transaction(
    async (tx) => {
      // Only rows still DRAFT, in case someone changed one in the back office meanwhile.
      await tx.route.updateMany({ where: { id: { in: targets.map((r) => r.id) }, status: "DRAFT" }, data: { status: "PUBLISHED" } });
      await tx.changeLog.createMany({
        data: targets.map((r) => ({
          actor: "script:publish-routes",
          entity: "Route",
          entityId: r.id,
          action: "UPDATE" as const,
          routeId: r.id,
          summary: `Route ${r.slug} publiée`,
          changes: { status: ["DRAFT", "PUBLISHED"] },
        })),
      });
    },
    { timeout: 60_000, maxWait: 15_000 },
  );
  const after = await prisma.route.groupBy({ by: ["status"], _count: true });
  console.log(`Published. Routes now: ${after.map((g) => `${g.status} ${g._count}`).join(", ")}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
