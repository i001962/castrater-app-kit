FROM node:20-alpine AS base
RUN npm install -g pnpm@9

WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/proofs/package.json ./packages/proofs/
COPY packages/qkms/package.json ./packages/qkms/
COPY packages/wallet/package.json ./packages/wallet/
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
