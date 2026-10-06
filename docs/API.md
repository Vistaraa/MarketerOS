# MarketerOS API (read-only keys)

Workspace owners and admins create keys in **Settings → API Key Management**. A key reads its own workspace's data,
much like a Viewer would. It can't change anything, and it can't reach account, billing or security endpoints.

## Authentication

```bash
export MARKETEROS_API_KEY="<your key>"   # starts with mk_live_
curl -H "Authorization: Bearer $MARKETEROS_API_KEY" https://your-domain.com/api/v1/campaigns
```

- The secret is shown once, when the key is created. Only a hash is stored, so a lost key can't be recovered: revoke it and create a new one.
- Keys work only with `GET` requests to `/api/v1/...`. Anything else returns `403` (`API_KEY_READ_ONLY` or `API_KEY_NOT_ALLOWED`).
- Each key allows **300 requests per minute**. Over the limit you get `429` with a `Retry-After` header.
- Revoking a key takes effect immediately.

## Endpoints

| Endpoint | Returns |
|---|---|
| `GET /api/v1/overview` (`?dateFrom=YYYY-MM-DD&dateTo=…&clientId=…&platform=…`) | KPIs, daily series, spend by channel, campaigns |
| `GET /api/v1/campaigns`, `/api/v1/campaigns/:id` | Campaigns and their recorded metrics |
| `GET /api/v1/clients`, `/api/v1/clients/:id` | Clients |
| `GET /api/v1/leads`, `/api/v1/leads/:id` | Leads |
| `GET /api/v1/content`, `/api/v1/social/posts`, `/api/v1/social/accounts` | Content and social data |
| `GET /api/v1/reports`, `/api/v1/reports/:id` | Reports; `/api/v1/reports/:id/download?format=pdf\|csv` downloads the file |
| `GET /api/v1/integrations` | Connected platforms and sync history (no credentials) |
| `GET /api/v1/automation`, `/api/v1/ai/insights`, `/api/v1/team`, `/api/v1/search?q=…` | Automations, AI insights, team list, search |

Responses are JSON: `{ "data": … }` on success and `{ "error": { "code", "message" } }` on failure.
