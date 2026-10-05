# syntax = docker/dockerfile:1
# One Node service serves the app and README; user state stays on the Fly volume.
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
# /data is supplied as the course volume (or a throwaway mount in CI).
EXPOSE 8080
CMD ["node", "src/server.ts"]
