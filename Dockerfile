# syntax=docker/dockerfile:1

ARG BUN_VERSION=1.4.4

FROM oven/bun:${BUN_VERSION}-alpine AS base
WORKDIR /app

FROM base AS deps
ARG INSTALL_FILTER
COPY package.json bun.lock ./
COPY apps/bot/package.json apps/bot/
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN --mount=type=cache,target=/root/.bun/install/cache <<'EOS'
  set -eu
  cd /app
  if [ -n "${INSTALL_FILTER}" ]; then
    bun install --frozen-lockfile --production --filter "${INSTALL_FILTER}"
  else
    bun install --frozen-lockfile --production
  fi
  find node_modules apps/*/node_modules packages/*/node_modules -depth -type d \( -name "@types" -o -name "undici-types" -o -name "bun-types" \) 2>/dev/null | while read -r d; do rm -rf "$d"; done
  find node_modules apps/*/node_modules packages/*/node_modules -type f \( -name "*.d.ts" -o -name "*.d.mts" -o -name "*.d.cts" -o -name "*.js.map" -o -name "*.mjs.map" \) 2>/dev/null | while read -r f; do rm -f "$f"; done
  find node_modules apps/*/node_modules packages/*/node_modules -depth -type d \( -name test -o -name docs -o -name examples \) 2>/dev/null | while read -r d; do rm -rf "$d"; done
EOS

FROM base AS webbuild
COPY package.json bun.lock ./
COPY apps/bot/package.json apps/bot/
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile
COPY packages ./packages
COPY apps ./apps
RUN bun run build

FROM base AS bot
# ponytail: alpine ffmpeg ships every codec (~130MB); ceiling is full build.
# Upgrade path: minimal static ffmpeg (libwebp+x264+gif+mp4) if size matters.
RUN apk add --no-cache ffmpeg
ENV NODE_ENV=production
ENV KYNOS_DATA_DIR=/data
ENV KYNOS_AUTH_DIR=/data/baileys_auth
COPY --from=deps /app ./
COPY apps/bot/src ./apps/bot/src
COPY packages/db/src ./packages/db/src
COPY packages/shared/src ./packages/shared/src
RUN mkdir -p /data && chown -R bun:bun /data
USER bun
VOLUME /data
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=4s --start-period=25s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/bot/status >/dev/null || exit 1
CMD ["bun", "--smol", "run", "apps/bot/src/index.ts"]

FROM base AS web
ENV NODE_ENV=production
ENV KYNOS_DATA_DIR=/data
ENV PORT=3000
ENV HOST=0.0.0.0
COPY --from=webbuild /app/apps/web/.output ./apps/web/.output
RUN mkdir -p /data && chown -R bun:bun /data
USER bun
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=4s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/auth >/dev/null || exit 1
CMD ["bun", "run", "apps/web/.output/server/index.mjs"]
