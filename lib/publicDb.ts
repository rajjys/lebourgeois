import "server-only";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

/**
 * The public pages' database reads, cached (O-14). A drop-in for `prisma` in lib/routePages.ts,
 * lib/search.ts and lib/home.ts: `publicDb.flight.findMany(args)` returns what
 * `prisma.flight.findMany(args)` would, from Next's data cache when it has it.
 *
 * Why this is correct for pages that say "next departure" and "this week":
 * - Every public query filters by calendar day (from today on, the coming seven days), never by
 *   time of day. The day is in the arguments, so the cache key changes at midnight on its own.
 * - Time of day ("departed", "next") is worked out in code on every request, from the cached rows.
 * So a cached answer is only out of date when the data changes, and data changes come from:
 * - the back office: every write calls `refreshPublicPages()`, which expires the cache at once;
 * - scripts (timetable updates), which bypass the app: entries are refreshed after an hour at most.
 *
 * Outside Next (tests, scripts) there is no data cache, so reads go straight to the database.
 */

export const PUBLIC_DATA_TAG = "public-data";
/** The longest a script's write can take to reach the public pages. */
export const PUBLIC_DATA_MAX_AGE = 3600;

const READS = new Set(["findMany", "findFirst", "findUnique", "count", "aggregate", "groupBy"]);

// The data cache stores JSON: dates and decimals are tagged on the way in and rebuilt on the way out.
const DATE = "__date";
const DECIMAL = "__decimal";

export function encode(value: unknown): unknown {
  if (value instanceof Date) return { [DATE]: value.toISOString() };
  if (Prisma.Decimal.isDecimal(value)) return { [DECIMAL]: (value as Prisma.Decimal).toString() };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)]));
  }
  return value;
}

export function decode(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === DATE) return new Date((value as Record<string, string>)[DATE]);
    if (keys.length === 1 && keys[0] === DECIMAL) return new Prisma.Decimal((value as Record<string, string>)[DECIMAL]);
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, decode(v)]));
  }
  return value;
}

async function cachedRead(model: string, method: string, args: unknown) {
  const run = () => (prisma as unknown as Record<string, Record<string, (a: unknown) => Promise<unknown>>>)[model][method](args);
  if (!process.env.NEXT_RUNTIME) return run();
  const read = unstable_cache(async () => encode(await run()), ["public-db", model, method, JSON.stringify(args ?? null)], {
    tags: [PUBLIC_DATA_TAG],
    revalidate: PUBLIC_DATA_MAX_AGE,
  });
  return decode(await read());
}

type PublicModels = "airport" | "airline" | "route" | "routeAirline" | "flight" | "fareObservation";

/** Read-only: anything but a read throws, so a write can never go through the cache by mistake. */
const publicDb = new Proxy({} as Pick<typeof prisma, PublicModels>, {
  get(_target, model) {
    return new Proxy({}, {
      get(_m, method) {
        if (typeof method !== "string" || !READS.has(method)) throw new Error(`publicDb is read-only: ${String(model)}.${String(method)}`);
        return (args?: unknown) => cachedRead(String(model), method, args);
      },
    });
  },
});

export default publicDb;

/**
 * After a back-office write: the public pages read fresh data on their next request (not a stale
 * copy), and the home page, which is itself cached for ten minutes, is rebuilt.
 */
export function refreshPublicPages() {
  revalidateTag(PUBLIC_DATA_TAG, { expire: 0 });
  revalidatePath("/");
}
