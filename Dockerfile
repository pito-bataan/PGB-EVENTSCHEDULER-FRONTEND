# Multi-stage build for production optimization
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL=https://eventscheduler-api.bataan.gov.ph
ARG VITE_SOCKET_URL=https://eventscheduler-api.bataan.gov.ph
ARG VITE_NODE_ENV=production

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_NODE_ENV=$VITE_NODE_ENV
ENV NODE_OPTIONS=--max-old-space-size=2048

COPY package*.json ./

RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 3 && \
    npm ci --legacy-peer-deps --no-audit --loglevel=error

COPY . .

RUN npm run build -- --logLevel=warn

# Production stage
FROM nginx:alpine

# Copy custom entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 6010

# Use custom entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]