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

## Docker / Hetzner

Prereqs on the host:

- Docker 24+
- A reachable Obsidian vault at `${MYWIKI_HOST_PATH}` (defaults to `./data/mywiki` next to the compose file)
- Optional: a managed RankForge / Firecrawl / Content Studio stack reachable over HTTP

Build and run:

```bash
cd ~/projects/hermes/mission-control
docker compose -f deploy/docker-compose.yml build
docker compose -f deploy/docker-compose.yml up -d
docker compose -f deploy/docker-compose.yml logs -f mission-control
```

Healthcheck: `curl http://<host>:3000/api/health` should return a JSON body with `status: "ok"`.

### Behind a Hetzner load balancer

Point the LB at port 3000 with `/api/health` as the health-check path. The endpoint returns 200 when the process is alive and 503 if `env-validation` rejects the configuration (e.g. an unparseable `RANKFORGE_URL`).

### Environment variables

See `.env.example` for the full list. The compose file reads them from a local `.env` next to `docker-compose.yml` (or you can pass them inline). Every variable is **optional** — the app boots with sane defaults for development, but production should set `RANKFORGE_API_KEY` so the SEO Ops endpoints stop returning 503.

## Architecture notes

- Mission Control is stateless. The only on-disk state is the Obsidian vault, which lives outside the container.
- The `/api/agents/status` endpoint probes every feature service on every call. For very chatty clients, consider adding a short-lived cache (e.g. 5s SWR) — not done yet to keep the MVP simple.
- The `/api/health` endpoint is intentionally cheap: it does not call out to the network. Use it for liveness probes; use `/api/agents/status` for "is the rest of the system healthy" checks.
