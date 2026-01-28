#!/bin/sh
set -e

# Create Tailscale directories on persistent volume
mkdir -p /data/tailscale /var/run/tailscale

echo "[staging] Starting Tailscale daemon..."
tailscaled --state=/data/tailscale/tailscaled.state --socket=/var/run/tailscale/tailscaled.sock &

# Wait for daemon to be ready
sleep 5

echo "[staging] Connecting to Tailnet..."
tailscale up --authkey=${TAILSCALE_AUTHKEY} --hostname=landlordsoftware-staging

echo "[staging] Configuring Tailscale Serve..."
tailscale serve https:443 / http://localhost:3000

echo "[staging] Running database migrations..."
npx prisma migrate deploy

echo "[staging] Starting application..."
exec npm run start
