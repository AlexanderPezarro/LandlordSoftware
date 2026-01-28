# Deployment Setup Guide

This guide walks you through the manual steps required to complete the staging and production deployment setup.

## Prerequisites

- Fly.io account with flyctl installed and authenticated
- Tailscale account with admin access
- GitHub repository with admin access
- Your Tailscale tailnet name (e.g., `your-company.ts.net`)

---

## Step 1: Create Fly.io Apps

### 1.1 Create Base Image App (Registry Only)

```bash
flyctl apps create landlordsoftware-base
```

This app won't run any machines - it's just for storing the base Docker image in Fly's registry.

### 1.2 Create Staging App

```bash
flyctl apps create landlordsoftware-staging
```

### 1.3 Create Staging Volume

```bash
flyctl volumes create landlordsoftware_staging_data \
  --region lhr \
  --size 1 \
  --app landlordsoftware-staging
```

**Note:** Your production app `landlordsoftware` should already exist.

---

## Step 2: Generate Tailscale Auth Key

### 2.1 Access Tailscale Admin Console

1. Go to https://login.tailscale.com/admin/settings/keys
2. Click "Generate auth key"

### 2.2 Configure Auth Key Settings

Select these options:
- ✅ **Reusable** - Allows the key to be used multiple times
- ✅ **Ephemeral** - Nodes automatically cleanup when offline
- ✅ **Pre-authorized** - No manual approval needed
- Description: "Fly.io staging deployment"
- Optional: Set expiration (90 days recommended)

### 2.3 Copy the Generated Key

The key will look like: `tskey-auth-xxxxxxxxxxxxx-yyyyyyyyyyyyyyyyyyyy`

**Important:** Save this key immediately - you won't be able to see it again!

---

## Step 3: Set Fly.io Secrets

### 3.1 Set Tailscale Auth Key for Staging

```bash
flyctl secrets set TAILSCALE_AUTHKEY="tskey-auth-xxxxxxxxxxxxx-yyyyyyyyyyyyyyyyyyyy" \
  --app landlordsoftware-staging
```

Replace the key with your actual Tailscale auth key from Step 2.

### 3.2 Verify Secrets

```bash
flyctl secrets list --app landlordsoftware-staging
```

You should see `TAILSCALE_AUTHKEY` in the list (value will be hidden).

---

## Step 4: Configure GitHub Secrets

### 4.1 Get Fly.io API Token

```bash
flyctl auth token
```

This will output a long token string starting with `fo1_...`

### 4.2 Add Secret to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `FLY_API_TOKEN`
5. Value: Paste the token from Step 4.1
6. Click **Add secret**

---

## Step 5: Configure GitHub Environment Protection

### 5.1 Create Production Environment

1. Go to your GitHub repository
2. Navigate to **Settings** → **Environments**
3. Click **New environment**
4. Name: `production` (must be exactly this)
5. Click **Configure environment**

### 5.2 Add Required Reviewers

1. Under **Environment protection rules**, check **Required reviewers**
2. Search for and add yourself (or team members who should approve production deploys)
3. **Required reviewers:** Minimum 1 reviewer
4. Optional: Check **Prevent self-review** if you want another team member to always approve

### 5.3 Optional: Add Wait Timer

1. Check **Wait timer**
2. Set to **5 minutes** (prevents accidental instant deploys)
3. This gives you time to cancel if you pushed by mistake

### 5.4 Save Environment

Click **Save protection rules**

---

## Step 6: Initial Base Image Build

Before the GitHub Actions workflow can run, you need to build and push the base image manually once.

### 6.1 Authenticate Docker with Fly Registry

```bash
flyctl auth docker
```

### 6.2 Build Base Image

```bash
docker build --platform linux/amd64 \
  -t registry.fly.io/landlordsoftware-base:latest \
  -f Dockerfile.base .
```

This may take 5-10 minutes on first build.

### 6.3 Push Base Image

```bash
docker push registry.fly.io/landlordsoftware-base:latest
```

---

## Step 7: Test Staging Deployment

### 7.1 Deploy Staging Manually (First Time)

```bash
flyctl deploy --config fly.staging.toml --dockerfile Dockerfile.staging
```

### 7.2 Check Deployment Status

```bash
flyctl status --app landlordsoftware-staging
```

Wait until the machine shows as "started".

### 7.3 Verify Tailscale Connection

1. Go to https://login.tailscale.com/admin/machines
2. Look for a machine named `landlordsoftware-staging`
3. It should show as "Connected" with an IP like `100.64.x.x`

### 7.4 Test Access from Tailnet

From a device connected to your Tailnet:

```bash
curl https://landlordsoftware-staging.YOUR-TAILNET.ts.net
```

Replace `YOUR-TAILNET` with your actual tailnet name (e.g., `pango-lin.ts.net`).

You should see your application's HTML response.

### 7.5 Verify Public Access is Blocked

From a device NOT on your Tailnet (or disconnect from Tailscale):

```bash
curl https://landlordsoftware-staging.YOUR-TAILNET.ts.net
```

This should fail or timeout - proving the app is only accessible via Tailnet.

---

## Step 8: Test Production Deployment (Optional)

If you want to test the production deployment before the automated workflow:

```bash
flyctl deploy --config fly.toml --dockerfile Dockerfile.production
```

This will deploy to your existing production app using the new Dockerfile structure.

---

## Step 9: Enable Automated Deployments

### 9.1 Push to Main Branch

```bash
git push origin main
```

### 9.2 Monitor GitHub Actions

1. Go to your GitHub repository
2. Click **Actions** tab
3. You should see a new "Deploy" workflow running
4. Watch the progress:
   - `build-base` job should complete first
   - `deploy-staging` job should run next
   - `deploy-production` job will wait for approval

### 9.3 Test Staging

Once `deploy-staging` completes, test your staging app again from your Tailnet:

```bash
curl https://landlordsoftware-staging.YOUR-TAILNET.ts.net
```

### 9.4 Approve Production Deployment

1. In GitHub Actions, click on the running workflow
2. You'll see a yellow banner: "deploy-production is waiting for approval"
3. Click **Review deployments**
4. Check **production**
5. Click **Approve and deploy**

### 9.5 Monitor Production Deployment

The `deploy-production` job will now run and deploy to your production app.

---

## Verification Checklist

Before considering setup complete, verify:

- [ ] Base image app created (`landlordsoftware-base`)
- [ ] Staging app created (`landlordsoftware-staging`)
- [ ] Staging volume created and mounted
- [ ] Tailscale auth key generated and set as Fly secret
- [ ] GitHub secret `FLY_API_TOKEN` configured
- [ ] GitHub environment `production` created with required reviewers
- [ ] Base image built and pushed to registry
- [ ] Staging deployment successful
- [ ] Staging app visible in Tailscale admin (machine shows as connected)
- [ ] Staging app accessible from Tailnet devices
- [ ] Staging app NOT accessible from public internet
- [ ] GitHub Actions workflow runs successfully
- [ ] Production approval gate works correctly

---

## Troubleshooting

### Staging deployment fails with "cannot connect to Tailnet"

**Problem:** Tailscale auth key is invalid or expired.

**Solution:**
1. Generate a new auth key in Tailscale admin
2. Update Fly secret: `flyctl secrets set TAILSCALE_AUTHKEY="new-key" --app landlordsoftware-staging`
3. Redeploy: `flyctl deploy --config fly.staging.toml`

### GitHub Actions fails on "docker push"

**Problem:** GitHub Actions runner can't authenticate with Fly registry.

**Solution:**
1. Verify `FLY_API_TOKEN` secret is set correctly in GitHub
2. The token might have expired - regenerate: `flyctl auth token`
3. Update GitHub secret with new token

### Base image not found during staging/production build

**Problem:** Base image wasn't built or pushed to registry.

**Solution:**
1. Manually build and push base image (see Step 6)
2. Verify image exists: `flyctl releases --app landlordsoftware-base --image`

### Production deployment doesn't wait for approval

**Problem:** GitHub environment not configured correctly.

**Solution:**
1. Verify environment is named exactly `production`
2. Check that required reviewers are configured
3. Ensure you're pushing to the `main` branch

### Staging app accessible from public internet

**Problem:** Tailscale Serve not working correctly.

**Solution:**
1. Check staging logs: `flyctl logs --app landlordsoftware-staging`
2. Look for Tailscale connection messages
3. Verify `TAILSCALE_AUTHKEY` secret is set
4. Check Tailscale admin - is the machine connected?

---

## Accessing Your Applications

### Staging (Tailnet Only)

**URL:** `https://landlordsoftware-staging.YOUR-TAILNET.ts.net`

You must be connected to your Tailscale network to access staging.

### Production (Public)

**URL:** Your existing production domain (e.g., `https://landlordsoftware.fly.dev`)

Publicly accessible.

---

## Daily Workflow

### Deploying Changes

1. Create a branch and make your changes
2. Push and create a Pull Request
3. Merge PR to `main`
4. **Automatic:** Base image builds
5. **Automatic:** Staging deploys
6. **Manual:** Test on staging via Tailnet
7. **Manual:** Approve production deployment in GitHub Actions
8. **Automatic:** Production deploys after approval

### Rolling Back

If you need to rollback production:

```bash
# List recent releases
flyctl releases --app landlordsoftware

# Rollback to specific version
flyctl releases rollback <version> --app landlordsoftware
```

### Viewing Logs

**Staging:**
```bash
flyctl logs --app landlordsoftware-staging
```

**Production:**
```bash
flyctl logs --app landlordsoftware
```

---

## Cost Considerations

- **Base image app:** No running machines, only registry storage (~$0.10/GB/month)
- **Staging app:** Same as your current production costs (1 machine, 512MB RAM)
- **GitHub Actions:** Free for public repos, included minutes for private repos

**Total additional cost:** Approximately $5-10/month for staging environment.

---

## Security Notes

1. **Tailscale Auth Key:**
   - Store securely
   - Use ephemeral keys to auto-cleanup old nodes
   - Rotate periodically (recommended every 90 days)

2. **Fly.io API Token:**
   - Treat as highly sensitive
   - Only store in GitHub Secrets
   - Regenerate if compromised

3. **Staging Access:**
   - Only accessible via Tailnet
   - Manage Tailnet access in Tailscale admin
   - Use ACLs to restrict which Tailnet users can access staging

---

## Base Image Build Optimization

The workflow is optimized to skip base image rebuilds when only application code changes.

### When Base Image Rebuilds

The base image rebuilds ONLY when these files change:
- `package.json` or `package-lock.json` (server dependencies)
- `client/package.json` or `client/package-lock.json` (client dependencies)
- `prisma/schema.prisma` (database schema - requires Prisma client regeneration)
- `Dockerfile.base` (build configuration)

### When Base Image is Skipped

Application code changes skip the base build:
- `server/src/**` files (server code)
- `client/src/**` files (client code)
- `prisma/migrations/**` files (migrations run at startup, not build time)
- Documentation changes
- Configuration changes

### Performance Impact

- **With dependency changes:** ~8-10 min (full base image build)
- **Without dependency changes:** ~2-3 min (uses existing base image)

Most commits are application code changes, so you'll see significant time savings.

### Checking Build Status

In GitHub Actions, look for the `check-changes` job output:
- "✓ Base image rebuild required - dependencies changed" → Base will rebuild
- "✓ Skipping base image rebuild - no dependency changes" → Uses existing base

### Manual Base Image Rebuild

If you need to force a base image rebuild:

```bash
# Local rebuild and push
flyctl auth docker
docker build --platform linux/amd64 -t registry.fly.io/landlordsoftware-base:latest -f Dockerfile.base .
docker push registry.fly.io/landlordsoftware-base:latest
```

Or make a trivial change to `Dockerfile.base` (add a comment) and push.

---

## Next Steps

After completing this setup:

1. Test the full deployment workflow with a small change
2. Add Slack/Discord notifications for deployment events (optional)
3. Consider adding smoke tests between staging and production (optional)
4. Document your team's approval process for production deployments

---

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Fly.io logs for both apps
3. Check GitHub Actions workflow logs
4. Verify Tailscale machine status in admin console
5. Consult the design document: `docs/plans/2026-01-28-staging-production-release-design.md`
