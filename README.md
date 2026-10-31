# Clerikaa

Schedules and indicative prices for domestic flights in the DRC: which airline flies a route, on which days, at what time and for roughly what price, with the date and source of every figure.

**Where the project is going, what is done and what comes next: [docs/PLAN.md](docs/PLAN.md).** All documents: [docs/README.md](docs/README.md).

The site is still served from `lebourgeois.cd` until `clerikaa.com` is bought. The local database and folder names (`lebourgeois_dev`, `~/.lebourgeois`) keep the old name on purpose: renaming them would break existing setups for no benefit.

## Stack

- Next.js 16 (App Router) on Vercel
- PostgreSQL with Prisma 7 (Prisma Postgres in production)
- Tailwind CSS 4 with generated design tokens, shadcn/ui ([docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md))
- i18next (French default, English)

## Local setup

Requirements: Node.js 24, PostgreSQL 18 binaries (`initdb`, `pg_ctl`, `psql`).

1. Install dependencies:
   ```bash
   npm ci
   ```
2. Create a local database cluster (once). It runs on port 5433, separate from any system Postgres:
   ```bash
   initdb -D ~/.lebourgeois/pgdata -U postgres --auth-local=trust --auth-host=trust -E UTF8
   printf "\nlisten_addresses = 'localhost'\nport = 5433\n" >> ~/.lebourgeois/pgdata/postgresql.conf
   npm run db:start
   psql -h localhost -p 5433 -U postgres -c "create database lebourgeois_dev"
   ```
3. Create `.env.local` from [.env.example](.env.example). For local work, at minimum:
   ```bash
   DATABASE_URL=postgresql://postgres@localhost:5433/lebourgeois_dev
   AUTH_SECRET=<openssl rand -base64 48>
   ADMIN_EMAIL=<your email>
   ADMIN_PASSWORD_HASH=<node scripts/hash-password.mjs '<password>'>
   ```
   `.env.local` takes precedence over `.env` for both Next.js and Prisma. Keep production credentials out of your local files where possible.
4. Apply migrations and load reference data:
   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```
   Optional, to see the site with real routes: `npx tsx scripts/load-dev-timetables.ts` (CAA and Air Congo timetables, local databases only).
5. Start the app:
   ```bash
   npm run dev
   ```
   Site: http://localhost:3000 · Admin: http://localhost:3000/login

After a reboot, run `npm run db:start` before `npm run dev`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build. Checks the design tokens first (contrast, generated CSS up to date). On Vercel production builds it then runs `prisma migrate deploy`; preview and local builds skip that step. |
| `npm run tokens` | Regenerates `app/tokens.css` from `design/tokens.json` and checks colour contrast. Run after editing tokens. |
| `npm run db:start` | Starts the local Postgres cluster |
| `npm run test` | Unit tests, plus the database rules (unique flights, checks) and the route workspace actions (apply, copy, cancel, edit a day, verify, undo) on the local database with throwaway rows. The database part is skipped on any non-local database. Runs with the `react-server` condition so server-only modules can be imported. |
| `npm run db:seed` | Loads reference data (airports, airlines, statuses, priority routes). Only adds what is missing, so it never undoes a back-office edit. Refuses non-local databases unless `ALLOW_REMOTE_DB=1`. |
| `node scripts/hash-password.mjs '<password>'` | Produces the `ADMIN_PASSWORD_HASH` value |
| `npx tsx scripts/clean-legacy-data.ts [--production] [--apply]` | Removes data from before the route model: expired schedules, prices copied from them, route records left empty (never priority routes, requests or messages). Previews by default; `--apply` writes a backup to `~/.lebourgeois/backups` first, then deletes in one transaction and logs each deletion. `--production` reads the database address from `.env`. |
| `npx tsx scripts/load-dev-timetables.ts` | Local preview data: deletes expired schedules, then loads CAA's 20 Oct 2026 timetable and Air Congo's schedule PDF, typed in by hand, as flights on dates, and publishes each airline on its routes so the local search shows them. Refuses any non-local database. |

## Troubleshooting

- **Styles look old in development** (old colours, missing classes) although the files are right: Turbopack's development cache is stale. Stop `npm run dev`, move or delete `.next/dev/cache/turbopack`, and start again. Seen with Next.js 16.4.3 on 2026-10-30.
- **The design system page** is at `/dashboard/design` (log in first).
- **"Cannot read properties of undefined" on a model after a schema change**: the dev server keeps the Prisma client it started with. Run `npx prisma generate`, then restart `npm run dev`.

## Data safety rules

- Never run migrations or the seed against production from a laptop by accident. Prisma reads `.env.local` first, and the seed refuses remote hosts unless `ALLOW_REMOTE_DB=1` is set.
- Production schema changes ship as Prisma migrations in `prisma/migrations` and are applied by the production build.
- Imported or unverified data is stored as `PENDING` and is not public until approved.

## Deployment

Pushes to `main` deploy to production on Vercel. Required environment variables are listed in [.env.example](.env.example).
