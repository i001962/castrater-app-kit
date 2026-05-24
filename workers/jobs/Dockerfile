FROM node:20-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY workers/jobs/package.json ./workers/jobs/
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/queue/package.json ./packages/queue/
COPY packages/kv/package.json ./packages/kv/
COPY packages/storage/package.json ./packages/storage/
COPY packages/qkms/package.json ./packages/qkms/
COPY packages/wallet/package.json ./packages/wallet/
COPY packages/proofs/package.json ./packages/proofs/
COPY packages/inference/package.json ./packages/inference/
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS builder
COPY workers/jobs ./workers/jobs
COPY packages ./packages
COPY tsconfig.base.json ./
RUN pnpm --filter @castrater/jobs-worker build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/workers/jobs/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
