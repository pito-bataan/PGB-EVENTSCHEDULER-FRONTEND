#!/bin/sh
set -e

# Don't use a PID file - just let nginx run without it
# This works perfectly in Docker containers
exec nginx -g "daemon off; pid /dev/null;"