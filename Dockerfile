# Multi-stage build for production-ready SAP MVP Framework API

# Stage 1: Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.1

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/services/package.json ./packages/services/
COPY packages/user-access-review/package.json ./packages/user-access-review/
COPY packages/api/package.json ./packages/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.1

# Copy dependencies
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages ./packages

# Copy source code
COPY . .

# Build all packages
RUN pnpm build

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.1

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/services/package.json ./packages/services/
COPY packages/user-access-review/package.json ./packages/user-access-review/
COPY packages/api/package.json ./packages/api/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built files from builder
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/services/dist ./packages/services/dist
COPY --from=builder /app/packages/user-access-review/dist ./packages/user-access-review/dist
COPY --from=builder /app/packages/api/dist ./packages/api/dist

# Create non-root user
RUN addgroup -g 1001 -S sapframework && \
    adduser -S sapframework -u 1001 && \
    chown -R sapframework:sapframework /app

USER sapframework

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "packages/api/dist/server.js"]
