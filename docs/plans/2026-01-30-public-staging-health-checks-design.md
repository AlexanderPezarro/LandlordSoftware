# Public Staging Environment with Deployment Health Checks

**Date:** 2026-01-30
**Status:** Approved

## Overview

Make staging environment publicly accessible (not just Tailscale) to mirror production setup, and add automated health checks after each deployment to verify the site is responding before allowing production deploys.

## Current State

- **Production** (`landlordsoftware`): Publicly accessible at `landlordsoftware.fly.dev`
- **Staging** (`landlordsoftware-staging`): Tailscale-only, no public HTTP access
- **Deployment**: Auto-deploy on push to main, manual approval gate for production via GitHub Environments
- **No health checks**: Deployments complete without verifying the app is actually responding

## Goals

1. Make staging environment identical to production for realistic testing
2. Add automated health checks after staging deployment
3. Block production deployment if staging health checks fail
4. Verify production deployment with health checks
5. Maintain existing manual approval gate for production

## Design Decisions

### 1. Staging Public Access

**Approach:** Add `[http_service]` block to `fly.staging.toml` matching production configuration.

**Result:** Staging accessible at `https://landlordsoftware-staging.fly.dev`

**Configuration:**
```toml
[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0
  processes = ['app']
```

**Benefits:**
- Identical network configuration to production
- Tests HTTPS, auto-scaling, machine lifecycle
- No DNS setup required (uses Fly.io default domain)

### 2. Health Check Strategy

**Approach:** Simple uptime checks via curl after each deployment.

**Parameters:**
- 5 curl attempts over ~30 seconds (5s between retries)
- Success = at least 1 HTTP 200 response
- Initial 10s wait after deployment for machines to wake up

**Rationale:**
- Handles cold starts gracefully (only needs 1 success)
- Fast feedback (30s max)
- Simple and reliable (no complex endpoint dependencies)

### 3. Deployment Flow

**Complete workflow:**

1. Push to `main` branch
2. Check for dependency changes
3. Build base image (if needed)
4. **Deploy to staging**
5. **Health check staging** (5 attempts)
   - ❌ Fail → Stop workflow, don't deploy to production
   - ✅ Pass → Continue
6. **Wait for manual approval** (GitHub environment protection)
7. **Deploy to production** (after approval)
8. **Health check production** (verification only)

**Key behaviors:**
- Staging health check is a gate (blocks production)
- Production health check is verification (doesn't block future deploys)
- Manual approval only appears if staging is healthy
- All checks visible in GitHub Actions logs

## Implementation Details

### File Changes

1. **`fly.staging.toml`**
   - Add `[http_service]` section

2. **`.github/workflows/deploy.yml`**
   - Add health check step after staging deployment (blocks on failure)
   - Add health check step after production deployment (verification)

### Health Check Script

```bash
SUCCESS=0
for i in {1..5}; do
  echo "Attempt $i/5..."
  if curl -f -s -o /dev/null -w "%{http_code}" https://[DOMAIN] | grep -q "200"; then
    echo "✓ Success"
    SUCCESS=1
    break
  else
    echo "✗ Failed, retrying in 5s..."
    sleep 5
  fi
done
if [ $SUCCESS -eq 0 ]; then
  echo "Health check failed - site is not responding"
  exit 1
fi
echo "✓ Health check passed"
```

## Success Criteria

- Staging accessible at public URL without Tailscale
- Staging deployment failures prevent production deployment
- Health check failures visible in GitHub Actions with clear error messages
- Manual approval gate still required for production
- Production health checks verify successful deployment

## Risks & Mitigations

**Risk:** Staging contains sensitive test data exposed publicly
**Mitigation:** Use separate test database/seed data for staging (already in place with separate volume)

**Risk:** Cold starts cause false health check failures
**Mitigation:** Lenient success criteria (1/5 successes), 10s initial wait

**Risk:** Health check passes but app is broken
**Mitigation:** This is basic uptime only; manual testing still required before approving production

## Future Enhancements

- Add dedicated `/health` endpoint that checks database connectivity
- Smoke test critical endpoints (auth, API routes)
- Slack notifications on deployment status
- Automatic rollback on production health check failure
