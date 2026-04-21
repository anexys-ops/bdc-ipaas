# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (lockfile optional when build context is apps/api only)
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile || pnpm install

# Copy source files
COPY . .

# Generate Prisma clients
RUN npx prisma generate --schema=./src/prisma/schema.prisma

# Build application
RUN pnpm build

# Stage pour exécuter les migrations (réutilise builder, prisma déjà installé)
FROM builder AS migrator
WORKDIR /app
ENTRYPOINT ["npx", "prisma", "migrate", "deploy", "--schema=./src/prisma/schema.prisma"]

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm and production dependencies only
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && (pnpm install --prod --frozen-lockfile || pnpm install --prod)

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/src/prisma ./src/prisma

# Définitions des connecteurs : monter le volume repo `../../connectors` ou utiliser `docker/Dockerfile.api` (monorepo).

# Security: run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/main"]
