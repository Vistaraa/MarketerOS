# MarketerOS

MarketerOS is an all-in-one marketing operating system designed for managing multi-channel campaigns, analytics, content creation, leads, integrations, automation, and client reporting.

---

## 🚀 Tech Stack

- **Framework:** Next.js 15 (App Router), React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS, Lucide Icons
- **Database & ORM:** PostgreSQL, Prisma ORM
- **Charts:** Recharts
- **Testing:** Vitest

---

## 📋 Prerequisites

Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) v20 or v22 (CI uses v22)
- [PostgreSQL](https://www.postgresql.org/) (v14+)
- (Optional) [pgAdmin](https://www.pgadmin.org/) or [DBeaver](https://dbeaver.io/) for database management

---

## 🛠️ Quick Start Guide

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd moneymaker
npm install
```

### 2. Configure Environment Variables

Create your local `.env` file from the example:

```bash
# On macOS / Linux:
cp .env.example .env

# On Windows (PowerShell):
copy .env.example .env
```

Open `.env` and configure your PostgreSQL database credentials:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/marketeros"
SESSION_SECRET="marketeros_super_secret_session_key_min_32_characters_long"
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
```

> **Note:** If your PostgreSQL password contains special characters (like `@`, `#`, `$`, `%`), make sure to URL-encode them (e.g., `@` becomes `%40`).

---

### 3. Initialize Database

1. Ensure your PostgreSQL server is running and create the `marketeros` database if it does not already exist.
2. Apply the database migrations to create the tables:

```bash
npx prisma migrate deploy
```

> **Changing the schema:** edit `prisma/schema.prisma`, then run `npx prisma migrate dev --name describe_the_change` to create and apply a migration. Commit the new folder in `prisma/migrations`; CI fails if the schema and migrations disagree. Don't use `prisma db push` against shared or production databases.
>
> **Databases created earlier with `db push`:** mark the baseline as already applied once with `npx prisma migrate resolve --applied 0_init`, then run `npx prisma migrate deploy`.

*Note: The application is completely self-bootstrapping. Baseline plans and system configurations are automatically synchronized when the server boots—no manual seeding is required.*

---

### 4. Start the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 👤 User Registration & Authentication

MarketerOS is built for live multi-tenant production:
- **Create Account:** Register a new workspace and account at [`/auth/signup`](http://localhost:3000/auth/signup).
- **Sign In:** Access your workspace at [`/auth/login`](http://localhost:3000/auth/login).

---

## 🗄️ Viewing & Managing Database Data

### Option A: Prisma Studio (Visual Browser GUI)
Prisma includes an interactive visual data browser:
```bash
npx prisma studio
```
Then navigate to [http://localhost:5555](http://localhost:5555).

### Option B: pgAdmin / Database Client
Connect pgAdmin to `localhost:5432`, select database `marketeros`, and inspect tables under `Schemas` ➔ `public` ➔ `Tables`.

---

## ⚙️ Background Jobs

Report generation and integration syncs are queued as background jobs. Something must run them, or they stay queued:

- **Servers and containers:** run the worker alongside the app. It polls every few seconds, retries failed jobs with backoff, recovers jobs left running by a crashed worker, and shuts down cleanly on `SIGTERM`.

  ```bash
  npm run worker          # long-running
  npm run worker:once     # process what's due, then exit
  ```

- **Vercel:** `vercel.json` calls `/api/cron/jobs` every minute. Set `CRON_SECRET` in the Vercel project; the endpoint is disabled without it. Per-minute crons need a paid Vercel plan.

---

## 🚀 Deploying to Production

The full step-by-step runbook (accounts, environment variables, first launch, every release, verification, rollback) is in **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**. Summary:


1. **Configuration:** set `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, `ENCRYPTION_KEY` and `APP_URL`. The server refuses to start without them. See `.env.example` for email, storage, jobs and monitoring settings.
2. **Database:** run `npx prisma migrate deploy` on every deploy.
3. **One-time cleanup** of demo data that older versions generated: `npx tsx scripts/purge-synthetic-data.ts` (dry run), then add `--apply`.
4. **Media storage:** set `STORAGE_DRIVER=s3` and the `S3_*` settings on serverless hosts (local disk storage is lost on Vercel). Browsers upload straight to the bucket with presigned URLs, so add a CORS rule to the bucket allowing `PUT` with a `Content-Type` header from your `APP_URL` origin. These settings must be present at build time too, because the storage origin is added to the Content-Security-Policy.
5. **Error monitoring (optional):** set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`; add `SENTRY_ORG`, `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN` to upload source maps.

## 🤖 AI Usage Limits

AI generation is limited per user (20 requests/minute) and per workspace (300/hour), and stops when the workspace has used its plan's monthly AI credits (100 tokens = 1 credit, plus purchased bonus credits) for the current billing period. Provider problems (quota, invalid key, unavailable model) are reported to users as clear messages; full details go to the server logs and Sentry.

## ✅ Continuous Integration

`.github/workflows/ci.yml` runs on every push and pull request to `main`: it applies migrations to a fresh PostgreSQL, checks that `schema.prisma` matches the migrations, then runs the typecheck, lint, unit tests and a production build, starts the built app against S3-compatible test storage, and runs the end-to-end tests (`tests/e2e`: API, security and real-browser checks) against it. Run them locally against any running instance with `BASE_URL=http://localhost:3000 npm run test:e2e`; tests that need S3, a cron secret or Chrome skip themselves when those aren't available.

---

## 🧪 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Next.js development server |
| `npm run build` | Creates a production build |
| `npm run start` | Starts the production server |
| `npm run typecheck` | Validates TypeScript types |
| `npm run lint` | Runs ESLint |
| `npm test` | Runs the Vitest test suite |
| `npm run test:e2e` | Runs end-to-end security tests against a running app (`BASE_URL`, default `http://localhost:3000`) |
| `npm run prisma:migrate:dev` | Creates and applies a migration after a schema change (development) |
| `npm run prisma:migrate:deploy` | Applies pending migrations (production, CI) |
| `npm run worker` | Runs the background job worker |
| `npm run worker:once` | Processes due background jobs once, then exits |

---

## 🌐 Key API Routes

- `GET /api/health` – Server health status
- `POST /api/auth/login|signup|logout` – Authentication & session management
- `GET /api/v1/overview` – Aggregated workspace KPIs and charts
- `GET|POST /api/v1/campaigns` – Campaign management
- `GET|POST /api/v1/leads` – Lead pipeline
- `GET /api/v1/integrations` – Connected platform integrations
- `GET /api/v1/ai/insights` – AI recommendations
- `POST /api/v1/billing/checkout` – Subscription billing

