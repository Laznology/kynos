# Deploy with Docker Compose

Compose runs the web dashboard and bot daemon. Both use the named `kynos-data` volume for the SQLite database. The bot daemon also stores its WhatsApp session in this volume.

## Prerequisites

- Docker Engine with the Docker Compose v2 plugin
- `openssl` to generate a session secret

Run commands from the repository root, where `docker-compose.yml` is located.

## Environment configuration

Create `.env` from the template:

```bash
cp .env.example .env
```

Generate a random session secret:

```bash
openssl rand -hex 32
```

Copy the output into `SESSION_SECRET` in `.env`. Replace `ADMIN_PASSWORD` with a unique password. Do not commit or share `.env`.

| Variable | Required | Default | Used by | Description |
| --- | --- | --- | --- | --- |
| `ADMIN_PASSWORD` | Yes | None | `web` | Dashboard login password. Compose refuses to start if this is empty. |
| `SESSION_SECRET` | Yes | None | `web` | Secret used to sign session cookies. Use a random value and keep it unchanged when recreating containers to preserve sessions. |
| `WEB_PORT` | No | `3000` | Docker Compose | Host port. The port inside the container remains `3000`. For example, `WEB_PORT=8080` exposes the dashboard on host port `8080`. |

Example `.env`:

```dotenv
ADMIN_PASSWORD=replace-with-a-unique-password
SESSION_SECRET=paste-the-output-of-openssl-rand-hex-32-here
WEB_PORT=8080
```

If the password contains spaces or `#`, quote it according to dotenv syntax. Do not add `KYNOS_DATA_DIR` or `PORT` to `.env`; Compose sets these for the web container. The bot image uses `/data` and `/data/baileys_auth` as its data and authentication directories.

AI credentials do not need to be set as environment variables. Configure the provider, API key, endpoint, and model in the dashboard. These settings are stored in the persistent database volume.

## Start

```bash
docker compose up -d --build
```

Open `http://localhost:${WEB_PORT}`. If `WEB_PORT` is not set, open `http://localhost:3000`. Sign in with `ADMIN_PASSWORD`.

The bot runs as a separate service. Scan the WhatsApp QR code in the dashboard or view the bot logs:

```bash
docker compose logs -f bot
```

Other useful commands:

```bash
docker compose ps
docker compose logs -f web
docker compose restart
docker compose down
```

`docker compose down` stops and removes the containers but keeps the `kynos-data` volume.

## Change the dashboard port

Set the host port in `.env`, for example:

```dotenv
WEB_PORT=8080
```

Apply the change with:

```bash
docker compose up -d
```

The dashboard is then available at `http://localhost:8080`. The container port remains `3000`; do not change the right-hand side of the port mapping in `docker-compose.yml`.

## Update the images

Compose builds the images from the local source. After pulling source changes, rebuild and restart the services:

```bash
docker compose up -d --build
```

## Data and backups

The `kynos-data` volume stores the SQLite database and WhatsApp authentication session. Both `web` and `bot` use this volume. Keep it to preserve settings, history, and the WhatsApp session.

To create a backup while the application is stopped:

```bash
docker compose down
docker run --rm -v kynos-data:/data -v "$PWD":/backup alpine tar -czf /backup/kynos-data.tar.gz -C /data .
docker compose up -d
```

Compose may prefix the volume name with the project or directory name. Check the actual name with `docker volume ls`, then use that name instead of `kynos-data` in the backup command.

**Warning:** `docker compose down -v` removes the volume, including the database and WhatsApp session. Run it only when you intend to delete that data.
