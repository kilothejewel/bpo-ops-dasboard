#!/bin/sh
set -eu

# The app refuses to sign sessions in production without a strong
# SESSION_SECRET (lib/session.ts). For a zero-config local `docker compose
# up`, generate a random one per container start instead of falling back to
# a known value. Set SESSION_SECRET explicitly for anything shared.
if [ -z "${SESSION_SECRET:-}" ]; then
  SESSION_SECRET="$(node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("base64"))')"
  export SESSION_SECRET
  echo "SESSION_SECRET not set; generated a random one (sessions reset when this container restarts)."
fi

exec node server.js
