FROM node:20-alpine AS base
WORKDIR /app

# Dependencies
COPY package*.json ./
COPY packages/database/package*.json ./packages/database/
COPY apps/api/package*.json ./apps/api/
RUN npm install --workspace=@wisar/database --workspace=@wisar/api

# Prisma generate
COPY packages/database/prisma ./packages/database/prisma
RUN npx --prefix packages/database prisma generate

# Build
COPY . .
RUN npm run build:api

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages ./packages
COPY --from=base /app/apps/api/dist ./apps/api/dist
COPY --from=base /app/apps/api/package.json ./apps/api/package.json

EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
