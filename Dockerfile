# ==================================
# Multi-stage Dockerfile for ImobiBase
# ==================================

# Stage 1: Build dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 2: Build application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine AS runner
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 imobibase

# Copy production dependencies from deps stage
COPY --from=deps --chown=imobibase:nodejs /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=imobibase:nodejs /app/dist ./dist
COPY --from=builder --chown=imobibase:nodejs /app/package*.json ./

# Copy shared schema
COPY --chown=imobibase:nodejs shared ./shared

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Switch to non-root user
USER imobibase

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.cjs"]
