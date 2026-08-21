ARG NODE_VERSION=22.18.0
FROM mwader/static-ffmpeg:7.1.1@sha256:11a44711684c0b9f754c047dcd64235b8b52deab251bd0e0a86f22faa160749c AS ffmpeg
FROM node:${NODE_VERSION}-alpine3.22 AS deps

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/media/package.json packages/media/package.json
COPY packages/queue/package.json packages/queue/package.json
COPY packages/storage/package.json packages/storage/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# 타입체크·빌드가 생성된 Prisma 클라이언트를 필요로 한다. (OBS-002)
RUN pnpm prisma generate --schema prisma/schema.prisma
RUN pnpm --filter @aidream/worker build

FROM node:${NODE_VERSION}-alpine3.22 AS runner
ENV NODE_ENV=production
ENV FFMPEG_PATH=/usr/local/bin/ffmpeg
ENV FFPROBE_PATH=/usr/local/bin/ffprobe
ENV TMP_DIR=/tmp/aidream
WORKDIR /app

COPY --from=ffmpeg /ffmpeg /usr/local/bin/ffmpeg
COPY --from=ffmpeg /ffprobe /usr/local/bin/ffprobe
RUN ffmpeg -version | grep -q '^ffmpeg version 7\.1\.1' && \
  mkdir -p /tmp/aidream && chown node:node /tmp/aidream
COPY --from=build --chown=node:node /app/apps/worker/dist ./dist
COPY --from=build --chown=node:node /app/apps/worker/package.json ./package.json
COPY --from=deps --chown=node:node /app/node_modules ./node_modules

USER node
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "process.kill(1,0)"
CMD ["node", "dist/index.js"]
