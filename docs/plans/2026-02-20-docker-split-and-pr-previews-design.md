# Docker Image Split & PR Preview Environments

## Date: 2026-02-20

## Summary

Two changes to the build and deployment pipeline:

1. Split the Docker base image so it only contains dependencies (not the built application). A new `Dockerfile.app` handles the application build on top of the base.
2. Replace the staging deployment flow with per-PR preview environments on Fly.io. Commits to main deploy directly to production.

## Task 1: Docker Image Split

### Current State

`Dockerfile.base` installs dependencies AND builds the full application. `Dockerfile.production` and `Dockerfile.staging` are identical thin layers that just add the entrypoint script.

### New Structure

**`Dockerfile.base`** — dependencies only:
- `FROM node:24.12.0-slim`
- Install OS build packages (`openssl`, `build-essential`, etc.)
- Copy only dependency/schema files: `package.json`, `package-lock.json`, `client/package.json`, `client/package-lock.json`, `prisma/schema.prisma`
- `npm ci --include=dev` (root + client)
- `npx prisma generate`
- Final stage: slim image with `node_modules`, generated Prisma client, package files — no application source or build output

**`Dockerfile.app`** — replaces both `Dockerfile.production` and `Dockerfile.staging`:
- `FROM registry.fly.io/landlordsoftware-base:latest`
- Copy full application source
- `npm run build`
- Copy `docker-entrypoint.js`, set entrypoint + CMD

### Base Image Rebuild Trigger

Unchanged — rebuilds when any of these change:
- `package.json`, `package-lock.json`
- `client/package.json`, `client/package-lock.json`
- `prisma/schema.prisma`
- `Dockerfile.base`

## Task 2: PR Preview Environments

### Current Flow (being replaced)

Push to main → conditionally rebuild base → deploy staging → manual review gate → deploy production.

### New Flow

**On push to main (`deploy-main.yml`):**
1. Check if dependency files changed
2. Conditionally rebuild base image
3. Deploy directly to production using `Dockerfile.app` + `fly.toml`
4. Health check

**On PR events (`deploy-pr.yml`):**

Triggered by: `opened`, `synchronize`, `reopened`, `closed`

- **opened/reopened:**
  1. Conditionally rebuild base image if dependency files changed
  2. Create Fly.io app `landlordsoftware-pr-<number>`
  3. Create volume `pr_<number>_data`
  4. Deploy using `Dockerfile.app` with generated fly config
  5. Seed database via `flyctl ssh console`
  6. Post comment on PR with preview URL

- **synchronize (new push to PR):**
  1. Conditionally rebuild base image if dependency files changed
  2. Redeploy existing app (data persists, no re-seed)

- **closed/merged:**
  1. Destroy the Fly.io app
  2. Volumes are cleaned up with app destruction

### PR Preview Configuration

A `fly.preview.toml` template lives in the repo with placeholders:
- `APP_NAME_PLACEHOLDER` → `landlordsoftware-pr-<number>`
- `VOLUME_NAME_PLACEHOLDER` → `pr_<number>_data`

Substituted at deploy time via `sed` in the GitHub Action.

### PR Preview Resources

Same as production: 512MB RAM, 1 CPU.

### Naming Convention

- App: `landlordsoftware-pr-<number>` (e.g., `landlordsoftware-pr-42`)
- URL: `https://landlordsoftware-pr-42.fly.dev`
- Volume: `pr_<number>_data`

## File Changes

### Modified
- `Dockerfile.base` — remove source copy and `npm run build`
- `fly.toml` — update dockerfile reference to `Dockerfile.app`

### New
- `Dockerfile.app` — FROM base, copy source, build, entrypoint
- `fly.preview.toml` — template with placeholders for PR previews
- `.github/workflows/deploy-main.yml` — push to main → production
- `.github/workflows/deploy-pr.yml` — PR preview lifecycle

### Deleted
- `Dockerfile.staging`
- `Dockerfile.production`
- `fly.staging.toml`
- `.github/workflows/deploy.yml`
