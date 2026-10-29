# Kynos

WhatsApp bot with an AI agent, media features, and a web dashboard.

## Deploy with Docker Compose

See the [Docker Compose deployment guide](docs/deploy-docker-compose.md) for setup, environment variables, port configuration, updates, and backups.

Quick start:

```bash
cp .env.example .env
```

Set `ADMIN_PASSWORD` and `SESSION_SECRET` in `.env`, then run:

```bash
docker compose up -d --build
```

The dashboard is available at `http://localhost:3000` by default.

## Local development

```bash
bun install
bun run dev
```

Run the bot and web app together with `bun run dev:all`.
