# Staging and Production Release Process Design

**Date:** 2026-01-28
**Status:** Approved

## Overview

Implement a two-environment deployment strategy with automated staging deployments and approval-gated production releases. Staging is secured via Tailscale Serve (private network access only), while production remains publicly accessible.

## Architecture

### Three-Layer Docker Image Strategy

**Layer 1: Base Image**
- Shared foundation for both environments
- Contains application code, dependencies, and build artifacts
- Stored in Fly.io private registry
- Rebuilt on every push to main

**Layer 2a: Staging Image**
- Extends base image
- Adds Tailscale binaries and configuration
- Uses custom startup script for Tailscale Serve
- Accessible only via Tailnet

**Layer 2b: Production Image**
- Extends base image
- No Tailscale dependencies
- Uses existing production startup script
- Publicly accessible

### Deployment Flow

```
Push to main
    ↓
Build base image → Push to registry
    ↓
Deploy to staging (automatic)
    ↓
Wait for approval (GitHub environment protection)
    ↓
Deploy to production (on approval)
```

## Infrastructure

### Fly.io Apps

1. **landlordsoftware-base** (registry only, no running machines)
   - Stores base image in Fly.io private registry
   - Tagged with both `:latest` and `:${{ github.sha }}`

2. **landlordsoftware-staging**
   - Runs staging image with Tailscale
   - Accessible at `https://landlordsoftware-staging.your-tailnet.ts.net`
   - Requires Tailnet membership for access

3. **landlordsoftware** (existing production app)
   - Runs production image without Tailscale
   - Publicly accessible

### Tailscale Configuration

- **Access method:** Tailscale Serve (private network only)
- **Auth key type:** Reusable, ephemeral, pre-authorized
- **Hostname:** `landlordsoftware-staging`
- **Serve config:** `tailscale serve https / http://localhost:8080`

## Implementation Details

### File Structure

```
.
├── Dockerfile.base              # Base image with app + dependencies
├── Dockerfile.staging           # Staging: base + Tailscale
├── Dockerfile                   # Production: base only
├── docker-entrypoint.js         # Production startup (existing)
├── docker-entrypoint-staging.sh # Staging startup with Tailscale
├── fly.staging.toml             # Staging Fly config
├── fly.toml                     # Production Fly config (existing)
└── .github/workflows/deploy.yml # CI/CD workflow
```

### Dockerfile.base

```dockerfile
FROM node:20-slim AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy application code
COPY . .

# Build application
RUN npm run build
```

### Dockerfile.staging

```dockerfile
FROM registry.fly.io/landlordsoftware-base:latest

# Add Tailscale
COPY --from=tailscale/tailscale:stable /usr/local/bin/tailscaled /usr/local/bin/tailscaled
COPY --from=tailscale/tailscale:stable /usr/local/bin/tailscale /usr/local/bin/tailscale
RUN mkdir -p /var/run/tailscale /var/cache/tailscale /var/lib/tailscale

# Use staging entrypoint
COPY docker-entrypoint-staging.sh /app/docker-entrypoint-staging.sh
RUN chmod +x /app/docker-entrypoint-staging.sh

ENTRYPOINT ["/app/docker-entrypoint-staging.sh"]
```

### Dockerfile (Production)

```dockerfile
FROM registry.fly.io/landlordsoftware-base:latest

# Use production entrypoint
COPY docker-entrypoint.js /app/docker-entrypoint.js

ENTRYPOINT ["node", "/app/docker-entrypoint.js", "npm", "run", "start"]
```

### docker-entrypoint-staging.sh

```bash
#!/bin/sh
set -e

echo "[staging] Starting Tailscale daemon..."
tailscaled --state=/var/lib/tailscale/tailscaled.state --socket=/var/run/tailscale/tailscaled.sock &

# Wait for daemon to be ready
sleep 5

echo "[staging] Connecting to Tailnet..."
tailscale up --authkey=${TAILSCALE_AUTHKEY} --hostname=landlordsoftware-staging

echo "[staging] Exposing app via Tailscale Serve..."
tailscale serve https / http://localhost:8080 &

# Wait for Tailscale to be fully up
sleep 2

echo "[staging] Running database migrations..."
npx prisma migrate deploy

echo "[staging] Starting application..."
exec npm run start
```

### fly.staging.toml

```toml
app = "landlordsoftware-staging"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile.staging"

[env]
  NODE_ENV = "production"
  PORT = "8080"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

[mounts]
  source = "landlordsoftware_staging_data"
  destination = "/data"
```

### .github/workflows/deploy.yml

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-base:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker
        uses: docker/setup-buildx-action@v3

      - name: Authenticate with Fly registry
        run: flyctl auth docker
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Build and push base image
        run: |
          docker build --platform linux/amd64 \
            -t registry.fly.io/landlordsoftware-base:latest \
            -t registry.fly.io/landlordsoftware-base:${{ github.sha }} \
            -f Dockerfile.base .
          docker push registry.fly.io/landlordsoftware-base:latest
          docker push registry.fly.io/landlordsoftware-base:${{ github.sha }}

  deploy-staging:
    needs: build-base
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to staging
        run: flyctl deploy --config fly.staging.toml --dockerfile Dockerfile.staging
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://your-production-domain.com
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to production
        run: flyctl deploy --config fly.toml --dockerfile Dockerfile
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

## Setup Steps

### 1. GitHub Configuration

**Secrets** (Settings → Secrets and variables → Actions):
- `FLY_API_TOKEN` - Get with `flyctl auth token`

**Environment** (Settings → Environments):
1. Create environment named `production`
2. Enable "Required reviewers"
3. Add team members as reviewers
4. Optional: Add wait timer (e.g., 5 minutes)

### 2. Tailscale Configuration

Generate ephemeral auth key:
1. Tailscale Admin Console → Settings → Keys
2. Generate auth key with:
   - ✅ Reusable
   - ✅ Ephemeral
   - ✅ Pre-authorized
3. Set in Fly: `flyctl secrets set TAILSCALE_AUTHKEY="tskey-auth-xxx" --app landlordsoftware-staging`

### 3. Fly.io App Creation

```bash
# Create base image app (registry only)
flyctl apps create landlordsoftware-base

# Create staging app with volume
flyctl apps create landlordsoftware-staging
flyctl volumes create landlordsoftware_staging_data --region iad --size 1 --app landlordsoftware-staging

# Production should already exist
```

## Access Patterns

### Staging
- **URL:** `https://landlordsoftware-staging.your-tailnet.ts.net`
- **Access:** Tailnet members only
- **Auth:** Network-level (Tailscale Serve)
- **Database:** Separate SQLite volume (`landlordsoftware_staging_data`)

### Production
- **URL:** Public domain (existing configuration)
- **Access:** Public internet
- **Auth:** Application-level (existing auth system)
- **Database:** Separate SQLite volume (`landlordsoftware_data`)

## Benefits

1. **Network-level security** - Staging impossible to access without Tailnet membership
2. **Shared base image** - Faster deployments, consistent builds across environments
3. **Approval gate** - Prevents accidental production deployments
4. **Automatic staging** - Every merge to main is immediately testable
5. **Database isolation** - Separate volumes prevent cross-contamination
6. **Simple rollback** - Git revert + push triggers new staging deployment

## Future Enhancements

- Add smoke tests between staging deployment and production approval
- Implement blue-green deployments for zero-downtime releases
- Add Slack/Discord notifications for deployment status
- Create staging database seeding for consistent test data
