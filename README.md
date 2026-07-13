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

Agent context headers (required on status/call/disconnect):

- `X-Agentblit-Agent-Id`
- `X-Agentblit-Workspace-Id`

Status response:

```json
{ "status": "setup_required" | "configured", "configuration_url": "https://.../setup" }
```

Setup URL includes query params: `agentId`, `workspaceId`, `connectorKey`.

## Local development

```bash
cp .env.example .env
docker compose up --build
# app: http://localhost:3080
# postgres: localhost:5433
```

Or without Docker for the app:

```bash
pnpm install
pnpm db:migrate
pnpm dev --port 3080
```

## Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection |
| `AGENTBLIT_APP_URL` | Post-setup redirect base |
| `PUBLIC_BASE_URL` | Absolute `configuration_url` base |

## Build and push

```bash
docker build --platform linux/amd64 -t registry.agentblit.com/appointment-tool:latest .
docker push registry.agentblit.com/appointment-tool:latest
```
