# API image — works on any container host (Northflank, Render, Fly, Cloud Run, a VPS).
# Build from the repo root:  docker build -t eonvoice-api .
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* && corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile \
    && DATABASE_URL=postgresql://x:x@localhost:5432/x DIRECT_URL=postgresql://x:x@localhost:5432/x pnpm db:generate
ENV NODE_ENV=production
EXPOSE 4000
# Workspace packages are TS source, so run via tsx (no .env file; config comes from host env vars).
CMD ["pnpm", "--filter", "@app/api", "exec", "tsx", "src/index.ts"]
