# Multi-stage build for production optimization
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Accept build arguments for environment variables
ARG VITE_API_URL=https://eventscheduler-api.bataan.gov.ph
ARG VITE_SOCKET_URL=https://eventscheduler-api.bataan.gov.ph
ARG VITE_NODE_ENV=production

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_NODE_ENV=$VITE_NODE_ENV
ENV NODE_OPTIONS=--max-old-space-size=4096

# Copy package files first (for better layer caching)
COPY package*.json ./

# Install ALL dependencies (including devDependencies needed for build)
# Don't set NODE_ENV=production yet, as it prevents devDependencies installation
RUN npm ci --legacy-peer-deps --no-audit --loglevel=error && \
    npm cache clean --force

# Copy source code
COPY . .

# Build the application with verbose logging
RUN npm run build -- --logLevel=warn

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