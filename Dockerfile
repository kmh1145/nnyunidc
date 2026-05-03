FROM node:22-alpine AS base

# 安装依赖层
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# 构建层
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN corepack enable pnpm && pnpm install --frozen-lockfile
RUN npx prisma generate
RUN pnpm build

# 运行层
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/package.json ./package.json

# Next.js standalone 输出
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

# 脚本
COPY --from=builder /app/scripts ./scripts
COPY --chmod=755 scripts/docker-entrypoint.sh ./docker-entrypoint.sh

# 复制 Prisma CLI 和 pg 适配器（运行时需要）
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma/adapter-pg ./node_modules/@prisma/adapter-pg
COPY --from=builder /app/node_modules/pg ./node_modules/pg
COPY --from=builder /app/node_modules/pg-connection-string ./node_modules/pg-connection-string
COPY --from=builder /app/node_modules/pgpass ./node_modules/pgpass
COPY --from=builder /app/node_modules/pg-int8 ./node_modules/pg-int8
COPY --from=builder /app/node_modules/pg-types ./node_modules/pg-types
COPY --from=builder /app/node_modules/pg-protocol ./node_modules/pg-protocol
COPY --from=builder /app/node_modules/pg-cloudconfig ./node_modules/pg-cloudconfig
COPY --from=builder /app/node_modules/postgres-array ./node_modules/postgres-array
COPY --from=builder /app/node_modules/postgres-bytea ./node_modules/postgres-bytea
COPY --from=builder /app/node_modules/postgres-date ./node_modules/postgres-date
COPY --from=builder /app/node_modules/postgres-interval ./node_modules/postgres-interval
COPY --from=builder /app/node_modules/postgres-range ./node_modules/postgres-range
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/node_modules/xtend ./node_modules/xtend
COPY --from=builder /app/node_modules/split2 ./node_modules/split2
COPY --from=builder /app/node_modules/obuf ./node_modules/obuf

RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["/app/docker-entrypoint.sh"]
