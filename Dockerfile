# syntax = docker/dockerfile:1
# One service; browser editor is built once, user state stays on the Fly volume.
FROM docker.io/library/node:24.21.0-bookworm-slim AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install --global pnpm@11.9.0 && pnpm install --frozen-lockfile
COPY scripts/build-board.mjs ./scripts/build-board.mjs
COPY board/ ./board/
RUN pnpm build:board

FROM docker.io/library/node:24.21.0-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install --global pnpm@11.9.0 && pnpm install --prod --frozen-lockfile

FROM docker.io/library/node:24.21.0-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080 DATA_DIR=/data
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json README.md ./
COPY src/ ./src/
COPY public/ ./public/
COPY --from=build /app/public/board-assets ./public/board-assets
EXPOSE 8080
CMD ["node", "--max-semi-space-size=16", "src/server.ts"]
