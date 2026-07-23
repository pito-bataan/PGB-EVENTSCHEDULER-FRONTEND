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

# Production stage - use unprivileged nginx (works in restricted environments)
FROM nginx:unprivileged

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080