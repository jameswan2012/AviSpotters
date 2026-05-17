#!/usr/bin/env bash
set -euo pipefail

URL="http://127.0.0.1:3000/api/cron/sync-external-bans?token=e9R18iIcwAomxxRwcr90oLwra8Y3X2JU7EfWhZV0VVbFPnaea3"
LOG_FILE="/www/wwwroot/www.avispotters.net/FlightBox/var/logs/cron-sync-external-bans.log"

mkdir -p "$(dirname "$LOG_FILE")"

ts="$(date '+%Y-%m-%d %H:%M:%S')"
resp="$(curl -sS --max-time 60 "$URL" || true)"
echo "[$ts] $resp" >> "$LOG_FILE"
