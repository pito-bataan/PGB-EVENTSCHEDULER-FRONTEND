# Multi-stage build for production optimization
FROM node:20-alpine AS builder

WORKDIR /app

# Accept build arguments for environment variables
ARG VITE_API_URL=https://eventscheduler-api.bataan.gov.ph
ARG VITE_SOCKET_URL=https://eventscheduler-api.bataan.gov.ph
ARG VITE_NODE_ENV=production

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_NODE_ENV=$VITE_NODE_ENV
# Reduced from 4096 to 2048 — less memory pressure on Coolify server
ENV NODE_OPTIONS=--max-old-space-size=2048

# Copy package files first (layer cache: only re-runs npm ci when package.json changes)
COPY package*.json ./

# Install dependencies
# IMPORTANT: Do NOT run "npm cache clean --force" here — it destroys Docker layer caching
# and forces a full re-download of all packages on every deploy.
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 3 && \
    npm ci --legacy-peer-deps --no-audit --loglevel=error

# Copy source code (this layer changes most often, so it comes after npm install)
COPY . .

# Build the Vite app
RUN npm run build -- --logLevel=warn

# Production stage — lightweight Nginx image
FROM nginx:alpine

# curl needed for HEALTHCHECK
RUN apk add --no-cache curl

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 6010

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:6010/health || exit 1

CMD ["nginx", "-g", "daemon off;"]