# MarketerOS

MarketerOS is an all-in-one marketing operating system designed for managing multi-channel campaigns, analytics, content creation, leads, integrations, automation, and client reporting.

---

## 🚀 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS, Lucide Icons
- **Database & ORM:** PostgreSQL, Prisma ORM
- **Charts:** Recharts
- **Testing:** Vitest

---

## 📋 Prerequisites

Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18.17+ or v20+)
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
2. Push the Prisma schema to create the tables:

```bash
npx prisma db push
```

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

## ⚙️ Background Worker (Optional)

To process background synchronization, scheduled reports, and automation tasks:

```bash
npm run worker
```

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
| `npm run prisma:push` | Pushes the schema directly to PostgreSQL |
| `npm run prisma:seed` | Seeds database with initial workspace & campaign data |

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

