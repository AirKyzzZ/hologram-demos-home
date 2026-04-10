# syntax=docker/dockerfile:1.7
# ─── builder ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@10.7.0 --activate

# Copy workspace manifest + package manifests for all workspaces so pnpm
# can resolve the dependency graph before installing.
COPY pnpm-workspace.yaml package.json ./
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/agent-pack/package.json packages/agent-pack/
COPY packages/vs-agent-core/package.json packages/vs-agent-core/
COPY apps/_template-vs/package.json apps/_template-vs/

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy sources and build the workspace graph for this app.
COPY packages/tsconfig packages/tsconfig
COPY packages/agent-pack packages/agent-pack
COPY packages/vs-agent-core packages/vs-agent-core
COPY apps/_template-vs apps/_template-vs
COPY tsconfig.base.json ./

RUN pnpm --filter @holo/agent-pack build \
 && pnpm --filter @holo/vs-agent-core build \
 && pnpm --filter template-vs build

# Prune dev dependencies before copying to runner.
RUN pnpm --filter template-vs deploy --prod /out

# ─── runner ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Non-root user for defense-in-depth.
RUN addgroup -S holo && adduser -S holo -G holo

COPY --from=builder --chown=holo:holo /out /app

USER holo

EXPOSE 3003

# Basic container healthcheck so Docker + k8s know the app is alive even
# without a liveness probe hitting it.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider "http://127.0.0.1:${APP_PORT:-3003}/health" || exit 1

CMD ["node", "dist/main.js"]
