# Multi-stage Docker build for RepoPulse
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace configurations
COPY package*.json tsconfig.json vitest.config.ts ./
COPY packages/ packages/

# Install dependencies and build all TypeScript packages
RUN npm install
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY --from=builder /app/packages/ packages/
COPY --from=builder /app/node_modules/ node_modules/

EXPOSE 3000

# Default command starts the web visualizer and architecture cartographer
CMD ["node", "packages/web/server.js"]
