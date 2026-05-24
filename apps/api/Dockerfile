FROM node:20-alpine AS base
RUN npm install -g pnpm@9

WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/kv/package.json ./packages/kv/
COPY packages/queue/package.json ./packages/queue/
COPY packages/storage/package.json ./packages/storage/
COPY packages/hypersnap/package.json ./packages/hypersnap/
COPY packages/farcaster/package.json ./packages/farcaster/
COPY packages/miniapp/package.json ./packages/miniapp/
COPY packages/qkms/package.json ./packages/qkms/
COPY packages/wallet/package.json ./packages/wallet/
COPY packages/proofs/package.json ./packages/proofs/
COPY packages/inference/package.json ./packages/inference/
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS builder
COPY apps/api ./apps/api
COPY packages ./packages
COPY tsconfig.base.json ./
RUN pnpm --filter @castrater/api build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
RUN chown -R node:node /app
USER node
EXPOSE 4001
CMD ["node", "dist/server.js"]
