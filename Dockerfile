# ─── Stage 1: Builder ──────────────────────────────────────────────────────────
# Installs all workspace dependencies, compiles the API server bundle,
# and builds the React frontend.
FROM node:24-slim AS builder

WORKDIR /workspace

# Install pnpm globally (same major as the repo uses)
RUN npm install -g pnpm@10

# ── Copy workspace manifests first for better layer caching ──
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Workspace package manifests
COPY lib/db/package.json                ./lib/db/
COPY lib/api-spec/package.json          ./lib/api-spec/
COPY lib/api-zod/package.json           ./lib/api-zod/
COPY lib/api-client-react/package.json  ./lib/api-client-react/
COPY artifacts/api-server/package.json  ./artifacts/api-server/
COPY artifacts/pulse/package.json       ./artifacts/pulse/

# Install all dependencies (frozen — uses exact lockfile versions)
RUN pnpm install --frozen-lockfile

# ── Copy full source ──
COPY tsconfig.json tsconfig.base.json* ./
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/
COPY artifacts/pulse/ ./artifacts/pulse/

# Build the API server (esbuild bundles everything into dist/)
RUN pnpm --filter @workspace/api-server run build

# Build the React frontend (outputs to artifacts/pulse/dist/public)
RUN PORT=8080 BASE_PATH=/ pnpm --filter @workspace/pulse run build


# ─── Stage 2: Runner ───────────────────────────────────────────────────────────
# Lean production image — compiled API bundle + frontend static files.
FROM node:24-slim AS runner

WORKDIR /app

# nodemailer is externalized from the esbuild bundle (not bundled),
# so it must be present in node_modules at runtime.
RUN npm install --omit=dev nodemailer@^8

# Copy the compiled API bundle and pino worker side-files
COPY --from=builder /workspace/artifacts/api-server/dist ./artifacts/api-server/dist

# Copy the built frontend static files (served by the API server)
COPY --from=builder /workspace/artifacts/pulse/dist/public ./artifacts/pulse/dist/public

# Runtime environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Required at runtime: DATABASE_URL (Postgres connection string)
# Optional:            VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL (web push)
#                      JWT_SECRET (defaults to a built-in value if not set)

CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
