# Production Dockerfile for Railway deployment
FROM node:18-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Copy all source code
COPY . .

# Build the application
RUN npm run build

# Ensure startup script is executable
RUN chmod +x ./start.sh

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S appuser -u 1001

# Create necessary directories
RUN mkdir -p /app/uploads /app/reports && chown -R appuser:nodejs /app

USER appuser

# Use platform PORT for exposure/healthcheck
EXPOSE 8080

# Health check uses dynamic PORT
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD sh -c 'curl -fsS http://localhost:$PORT/api/health || exit 1'

# Start via POSIX sh script to run migrations and seed
CMD ["sh", "./start.sh"]