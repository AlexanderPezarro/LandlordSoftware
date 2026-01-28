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

echo "[staging] Exposing app via Tailscale Serve..."
tailscale serve https / http://localhost:3000 &

# Wait for Tailscale to be fully up
sleep 2

echo "[staging] Running database migrations..."
npx prisma migrate deploy

echo "[staging] Starting application..."
exec npm run start
