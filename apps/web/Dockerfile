FROM node:20-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/config/package.json ./packages/config/
COPY packages/miniapp/package.json ./packages/miniapp/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS builder
COPY apps/web ./apps/web
COPY packages/config ./packages/config
COPY packages/miniapp ./packages/miniapp
COPY packages/shared ./packages/shared
COPY tsconfig.base.json ./
RUN pnpm --filter @castrater/web build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
RUN mkdir -p /var/cache/nginx /var/run /var/log/nginx \
  && chown -R nginx:nginx /usr/share/nginx/html /etc/nginx/conf.d /var/cache/nginx /var/run /var/log/nginx
USER nginx
EXPOSE 4000
