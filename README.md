# Le Bourgeois

Schedules and indicative prices for domestic flights in the DRC: which airline flies a route, on which days, at what time and for roughly what price, with the date and source of every figure.

**Where the project is going, what is done and what comes next: [docs/PLAN.md](docs/PLAN.md).**

## Stack

- Next.js 16 (App Router) on Vercel
- PostgreSQL with Prisma 7 (Prisma Postgres in production)
- Tailwind CSS, shadcn/ui
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
| `npm run build` | Production build. On Vercel production builds it first runs `prisma migrate deploy`; preview and local builds skip that step. |
| `npm run db:start` | Starts the local Postgres cluster |
| `npm run db:seed` | Loads reference data (airports, airlines, statuses). Idempotent. Refuses non-local databases unless `ALLOW_REMOTE_DB=1`. |
| `node scripts/hash-password.mjs '<password>'` | Produces the `ADMIN_PASSWORD_HASH` value |

## Data safety rules

- Never run migrations or the seed against production from a laptop by accident. Prisma reads `.env.local` first, and the seed refuses remote hosts unless `ALLOW_REMOTE_DB=1` is set.
- Production schema changes ship as Prisma migrations in `prisma/migrations` and are applied by the production build.
- Imported or unverified data is stored as `PENDING` and is not public until approved.

## Deployment

Pushes to `main` deploy to production on Vercel. Required environment variables are listed in [.env.example](.env.example).
