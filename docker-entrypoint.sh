#!/bin/sh
set -e

# Use /tmp - always writable in Traefik/Coolify environments
mkdir -p /tmp/nginx
chmod 777 /tmp/nginx

mkdir -p /var/cache/nginx /var/log/nginx
chown -R nginx:nginx /var/cache/nginx /var/log/nginx

exec nginx -g "daemon off;"