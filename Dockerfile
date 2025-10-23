# syntax=docker/dockerfile:1.4
# Multi-stage build for production optimization with BuildKit caching
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first (for better layer caching)
COPY package*.json ./

# Install dependencies with cache mount for faster rebuilds
# Cache npm packages between builds to speed up deployments
RUN --mount=type=cache,target=/root/.npm \
    npm install --legacy-peer-deps

# Copy source code (this layer changes most often, so it's last)
COPY . .

# Accept build arguments for environment variables
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ARG VITE_NODE_ENV=production

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_NODE_ENV=$VITE_NODE_ENV

# Build the application with cache mount for faster builds
RUN --mount=type=cache,target=/app/node_modules/.vite \
    npm run build

# Production stage with Nginx
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 6010
EXPOSE 6010

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:6010/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]