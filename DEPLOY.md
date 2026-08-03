# Mission Control — Deployment Guide

Two deployment modes are supported:

- **Local dev** — `npm run dev` on the host. Uses Node 22.22.3 (`.nvmrc`).
- **Hetzner / Docker** — `docker compose -f deploy/docker-compose.yml up`.

## Local dev

```bash
cd ~/projects/hermes/mission-control
nvm use 22
npm install
cp .env.example .env.local
# edit .env.local — at minimum set RANKFORGE_API_KEY
npm run dev
```

Open http://localhost:3000 and check `/api/health` for a liveness probe.

## Docker / Host rollout

Prereqs on the host:

- Docker 24+
- A reachable Obsidian vault at `${MYWIKI_HOST_PATH}` (defaults to `./data/mywiki` next to the compose file)
- Optional: a managed RankForge / Firecrawl / Content Studio stack reachable over HTTP

Build and run:

```bash
cd ~/projects/hermes/mission-control
docker compose --env-file deploy/.env -f deploy/docker-compose.yml build
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d
docker compose --env-file deploy/.env -f deploy/docker-compose.yml logs -f mission-control
```

Healthcheck: `curl http://<host>:<host-port>/api/health` should return a JSON body with `status: "ok"`.

### Safe default binding

The compose file now defaults to a **loopback-only** host bind:

- host bind: `127.0.0.1`
- host port: `3001`
- container port: `3000`

That means the default access path is:

```bash
curl http://127.0.0.1:3001/api/health
```

Override the bind/port explicitly in `deploy/.env` only when you really want wider exposure:

```env
MISSION_CONTROL_BIND_HOST=127.0.0.1
MISSION_CONTROL_HOST_PORT=3001
```

### Public / load-balanced deployment

If you later place Mission Control behind a reverse proxy or load balancer, bind it intentionally to a non-loopback interface in `deploy/.env`, then point the proxy/LB at that host port with `/api/health` as the health-check path. The endpoint returns 200 when the process is alive and 503 if `env-validation` rejects the configuration (e.g. an unparseable `RANKFORGE_URL`).

### Environment variables

See `.env.example` for the app-level variables and use `deploy/.env` for host-specific compose values. Important compose/runtime knobs include:

- `MISSION_CONTROL_BIND_HOST` — defaults to `127.0.0.1`
- `MISSION_CONTROL_HOST_PORT` — defaults to `3001`
- `MISSION_CONTROL_MYWIKI_PATH` — in-container path used by Mission Control
- `MYWIKI_HOST_PATH` — host path mounted into the container

Every other service variable is optional — the app boots with sane defaults for development, but production should set `RANKFORGE_API_KEY` when SEO audit writes are expected.

## Architecture notes

- Mission Control is stateless. The only on-disk state is the Obsidian vault, which lives outside the container.
- The `/api/agents/status` endpoint probes every feature service on every call. For very chatty clients, consider adding a short-lived cache (e.g. 5s SWR) — not done yet to keep the MVP simple.
- The `/api/health` endpoint is intentionally cheap: it does not call out to the network. Use it for liveness probes; use `/api/agents/status` for "is the rest of the system healthy" checks.
