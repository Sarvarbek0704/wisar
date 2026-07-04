# === Wisar web (Next.js 15) — standalone production image ===
FROM node:20-alpine AS base
WORKDIR /app

# Bog'liqliklar (workspace: web + content)
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/content/package*.json ./packages/content/
# --include-workspace-root: root package.json dagi hoisted deps ham (masalan @sentry/nextjs)
RUN npm install --workspace=@wisar/web --workspace=@wisar/content --include-workspace-root

# Manba + build (standalone output)
COPY . .
# Build vaqtidagi public env (NEXT_PUBLIC_*) — compose/CI dan uzatiladi
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN npm run build --workspace=@wisar/web

# === Runner ===
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# Xavfsizlik: root bo'lmagan foydalanuvchi
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Standalone chiqishi (monorepo tuzilmasini saqlaydi)
COPY --from=base --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=base --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=base --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3001
CMD ["node", "apps/web/server.js"]
