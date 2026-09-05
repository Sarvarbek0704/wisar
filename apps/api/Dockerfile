FROM node:20-alpine AS base
WORKDIR /app

# Dependencies
COPY package*.json ./
COPY packages/database/package*.json ./packages/database/
COPY apps/api/package*.json ./apps/api/
# --include-workspace-root: root package.json dagi hoisted deps (helmet, @nestjs/throttler/schedule, @sentry/nestjs, nodemailer, passport...)
RUN npm install --workspace=@wisar/database --workspace=@wisar/api --include-workspace-root

# Prisma generate (schema yo'lini aniq beramiz — CWD /app)
COPY packages/database/prisma ./packages/database/prisma
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# Build
COPY . .
RUN npm run build:api

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Xavfsizlik: root bo'lmagan foydalanuvchi (web image'da allaqachon shunday)
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

COPY --from=base --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=nestjs:nodejs /app/packages ./packages
COPY --from=base --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=base --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/package.json

USER nestjs
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
