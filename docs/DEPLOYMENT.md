# Deploying MarketerOS (Vercel + Supabase)

The runbook for the first production launch and every release after it. Follow the sections in order.

---

## 0. Before the first launch: owner actions (cannot be done in code)

- [ ] **Rotate the Google credentials** that were committed to this public repository (they remain in git history):
      reset the OAuth client secret in Google Cloud Console → Credentials, and reset the developer token in Google Ads → API Center.
- [ ] Create the **Supabase** project (Postgres) and turn on **Point-in-Time Recovery** or daily backups (paid plan).
- [ ] Create the **Vercel** project from this repo. Per-minute cron jobs need **Vercel Pro**.
- [ ] Create an **S3-compatible bucket** (Supabase Storage S3, Cloudflare R2 or AWS S3) and its access keys.
- [ ] Set up email sending: **Resend** (recommended) or SMTP, with your sending domain verified (SPF/DKIM).
- [ ] **PayU live** merchant key and salt.
- [ ] **Sentry** project (optional but recommended).
- [ ] Apply for platform access your customers will need: Google Ads API **Basic access**, Meta **App Review** (`ads_read`).
- [ ] Have the Terms of Service and Privacy Policy reviewed by a lawyer before taking payments.

## 1. Environment variables (Vercel → Settings → Environment Variables, Production)

The server **refuses to start** if a required value is missing, so misconfiguration shows up as a failed deploy, not a broken site.

| Variable | Required | Value |
|---|---|---|
| `DATABASE_URL` | yes | Supabase **transaction pooler**: `postgresql://…pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | yes | Supabase **direct** connection (port 5432), used only by `prisma migrate deploy` |
| `SESSION_SECRET` | yes | 64 random hex chars: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ENCRYPTION_KEY` | yes | 64 random hex chars (encrypts integration credentials; **never change it** after launch) |
| `APP_URL` | yes | `https://your-domain.com` (used in emailed links) |
| `STORAGE_DRIVER` | yes | `s3` (local disk is lost on Vercel) |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | yes | bucket credentials |
| `S3_ENDPOINT` | for R2/Supabase | provider endpoint URL (leave empty for AWS) |
| `S3_PUBLIC_UPLOAD_ORIGIN` | optional | the origin browsers upload to, if it differs from the one derived from `S3_ENDPOINT`/`S3_BUCKET` (allowed in the CSP) |
| `CRON_SECRET` | yes | random string; Vercel Cron sends it to `/api/cron/jobs` |
| `RESEND_API_KEY` + `RESEND_FROM`, or `SMTP_*` | yes | email delivery |
| `PAYU_MERCHANT_KEY`, `PAYU_MERCHANT_SALT`, `PAYU_ENV=production` | yes | PayU live keys (without them customers can't pay, so trials can't convert) |
| `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` | for AI features | any OpenAI-compatible provider |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | recommended | error monitoring |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | optional | source-map upload during builds |

Set the storage and Sentry variables for the **build** as well (Vercel applies them to builds by default): the storage origin is baked into the Content-Security-Policy.

## 2. Storage bucket CORS

Browsers upload media straight to the bucket. Add a CORS rule allowing `PUT` from your site:

```json
[{ "AllowedOrigins": ["https://your-domain.com"], "AllowedMethods": ["PUT"], "AllowedHeaders": ["content-type"], "MaxAgeSeconds": 600 }]
```

Recommended: a lifecycle rule that expires objects never registered by the app (abandoned uploads).

## 3. Database: first launch only

If the production database was originally created with `prisma db push` (before migrations existed), mark the baseline as applied once:

```bash
DATABASE_URL="<direct url>" DIRECT_URL="<direct url>" npx prisma migrate resolve --applied 0_init
```

Then apply migrations (also part of every release, section 4), and remove demo data that older versions generated:

```bash
npx prisma migrate deploy
npx tsx scripts/purge-synthetic-data.ts           # dry run: shows what would be deleted
npx tsx scripts/purge-synthetic-data.ts --apply   # deletes it
```

## 4. Every release

1. Merge to `main` only when **CI is green** (typecheck, lint, unit tests, build, and end-to-end tests against the built app).
2. Apply migrations **before** the new code serves traffic:
   ```bash
   DATABASE_URL="<pooled>" DIRECT_URL="<direct>" npx prisma migrate deploy
   ```
   (Alternatively set the Vercel **Production** build command to `npx prisma migrate deploy && npm run build`. Don't do this for Preview deployments that share the production database.)
3. Deploy (Vercel builds `main` automatically).
4. Verify (section 7).

## 5. Background jobs

`vercel.json` calls `/api/cron/jobs` every minute (report generation, integration syncs, retries, and the hourly billing lifecycle: trial and renewal reminders, past-due and read-only notices). It needs `CRON_SECRET` and a Vercel plan with per-minute cron. Without Vercel, run `npm run worker` as a separate long-running process instead.

## 6. Billing: trials, limits and lapsed workspaces

- **New workspaces** get a **14-day Pro trial**. Reminders are emailed 7 days and 1 day before a trial or paid period ends.
- **When a period ends unpaid**, the workspace is *past due*. After a **3-day grace period** it becomes **read-only**: everything stays viewable, and billing, notifications and personal settings keep working. Other changes return `402 SUBSCRIPTION_INACTIVE` until a payment goes through.
- **Plan limits** (team seats including pending invitations, clients, active campaigns) return `402 PLAN_LIMIT_REACHED`.
- **Plans change only through a verified PayU payment.** Without PayU keys in production, checkout returns `503 PAYMENTS_NOT_CONFIGURED`, so set them before launch.
- **Existing workspaces** created before trials existed were marked `complimentary` by the `20261006090000_billing_lifecycle` migration. They keep free access and never lock. To end that for a workspace, so it moves to a trial that ends in 14 days:
  ```sql
  UPDATE "Subscription" SET complimentary = false, status = 'TRIALING',
    "currentPeriodEnd" = timezone('utc', now()) + interval '14 days', "lastLifecycleNotice" = NULL
  WHERE "workspaceId" = '<workspace id>';
  ```
- PayU payments are one-off (no auto-debit). Customers renew from Billing after the reminder emails.

## 7. Verify a deployment

```bash
curl -s https://your-domain.com/api/health          # liveness: {"ok":true,...}
curl -s https://your-domain.com/api/health/ready    # readiness: 200 + "status":"ready"
```

`/api/health/ready` returns **503** if the database is unreachable, a migration is pending or failed, or storage isn't usable. Then:

- sign up a test account, upload an image in Content Studio, and generate a report;
- check Sentry received no new errors.

Point an **uptime monitor** (Better Stack, UptimeRobot…) at `/api/health/ready` every minute, alerting on non-200.

## 8. Rollback

- **Code:** Vercel → Deployments → previous deployment → *Promote to Production*.
- **Database:** migrations are forward-only. If a migration must be undone, write a new migration that reverses it. For data loss, restore with Supabase Point-in-Time Recovery.
- Rotate `SESSION_SECRET` only to force everyone to sign in again. **Never** rotate `ENCRYPTION_KEY` without re-encrypting stored credentials.

## 9. Ongoing operations

- Watch Sentry and the uptime monitor; review `npm audit --omit=dev` monthly (CI also runs it).
- Test restoring a backup into a scratch database at least once before launch.
