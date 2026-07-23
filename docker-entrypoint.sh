#!/bin/sh
set -e

# Ensure /run/nginx is writable
mkdir -p /run/nginx
chmod 755 /run/nginx
chown -R nginx:nginx /run/nginx

# Ensure /var/cache/nginx and /var/log/nginx exist
mkdir -p /var/cache/nginx /var/log/nginx
chown -R nginx:nginx /var/cache/nginx /var/log/nginx

# Start nginx
exec nginx -g "daemon off;"