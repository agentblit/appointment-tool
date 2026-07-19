# Appointment Tool

Standalone HTTP connector for Agentblit appointment booking.

## HTTP contract

| Endpoint | Method |
|----------|--------|
| `/api/1.0/tools/list` | GET |
| `/api/1.0/tools/call` | POST |
| `/api/1.0/connector/status` | GET |
| `/api/1.0/connector/disconnect` | POST |
| `/setup` | GET (config UI) |
| `/api/health` | GET |
| `/api/reminders/process` | POST (cron; bearer `REMINDER_CRON_SECRET`) |

Agent context header (required on status/call/disconnect):

- `X-Agentblit-Agent-Id`

Status response:

```json
{ "status": "setup_required" | "configured", "configuration_url": "https://.../setup" }
```

Setup URL includes query params: `agentId`, `connectorKey`.

## Local development

Postgres runs in Docker; the app runs locally with hot reload:

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm dev
# app: http://localhost:3080
# postgres: localhost:5433
# db:migrate (generate + apply) runs automatically on pnpm dev / container start
```

Reset the database (drops appointment, auth, and drizzle schemas; keeps `drizzle/` SQL files):

```bash
pnpm db:clean
pnpm dev   # re-applies migrations
```

## Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection |
| `AGENTBLIT_APP_URL` | Post-setup redirect base |
| `PUBLIC_BASE_URL` | App base URL (setup `configuration_url`, Better Auth, cron examples) |
| `BETTER_AUTH_SECRET` | Better Auth signing secret (required) |
| `RESEND_API_KEY` | Resend API key for reminder emails |
| `RESEND_FROM_EMAIL` | From address (verified domain in Resend) |
| `REMINDER_CRON_SECRET` | Bearer token for `/api/reminders/process` |

## Appointment reminders

Each connector has a **reminder window** (set in setup). When an appointment is within that many minutes of starting, the booker gets an email. `reminder_sent_at` ensures each appointment is reminded once (reset on reschedule).

### Calling every 3 minutes

This app does not run an in-process scheduler. Hit the endpoint from outside:

```bash
curl -X POST \
  -H "Authorization: Bearer $REMINDER_CRON_SECRET" \
  "$PUBLIC_BASE_URL/api/reminders/process"
```

## Build and push

```bash
docker build --platform linux/amd64 -t registry.agentblit.com/appointment-tool:latest .
docker push registry.agentblit.com/appointment-tool:latest
```
