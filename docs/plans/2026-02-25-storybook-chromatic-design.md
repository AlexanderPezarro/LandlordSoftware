# Storybook + Chromatic Integration Design

**Date:** 2026-02-25
**Branch:** feature/mui-to-scss-migration
**Context:** Part of PR 10 (MUI to SCSS migration). Stories already exist for all primitive and composed components. Storybook and `@chromatic-com/storybook` are already installed in `client/`.

---

## Goals

- `npm run storybook` at the repo root runs Storybook locally
- Every PR triggers a Chromatic build: visual diffs against the baseline, blocks merging if unreviewed changes exist
- Every push to `main` publishes a new baseline (auto-accepts changes)

---

## Local Development

Add to root `package.json` scripts:

```json
"storybook": "cd client && npm run storybook"
```

The client already has `storybook dev -p 6006` wired up. No storybook config changes needed.

---

## GitHub Actions Workflow

**File:** `.github/workflows/chromatic.yml`

### Triggers

| Event | Behaviour |
|---|---|
| `push` to `main` | Publishes new baseline, auto-accepts changes |
| `pull_request` | Publishes build, diffs against baseline, fails check if unreviewed changes |

### Job Steps

1. `actions/checkout@v4`
2. `npm ci` (root)
3. `cd client && npm ci`
4. `cd client && npm run build-storybook` → outputs to `client/storybook-static/`
5. `chromaui/action@v11` with:
   - `projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}`
   - `storybookBuildDir: client/storybook-static`
   - `autoAcceptChanges: main`
   - `exitZeroOnChanges: false`
   - `onlyChanged: true`
6. Post PR comment with Chromatic build URL (using `actions/github-script@v7`, same pattern as `deploy-pr.yml`)

### Concurrency

```yaml
concurrency:
  group: chromatic-${{ github.ref }}
  cancel-in-progress: true
```

Cancels in-progress runs when new commits are pushed to the same PR.

---

## One-Time Setup

These steps are performed once by the repo owner before the workflow can run.

### 1. Create Chromatic Project

1. Go to [chromatic.com](https://www.chromatic.com) and sign in with GitHub
2. Click "Add project" → select `AlexanderPezarro/LandlordSoftware`
3. Copy the generated project token (`chpt_...`)

### 2. Add GitHub Secret

- Repo → Settings → Secrets and variables → Actions → New repository secret
- Name: `CHROMATIC_PROJECT_TOKEN`
- Value: token from step above

### 3. Enable Branch Protection (blocking)

- Repo → Settings → Branches → Add rule for `main`
- Enable "Require status checks to pass before merging"
- Add `chromatic` as a required status check
- Note: `chromatic` only appears in the search after the workflow has run at least once on a PR

### 4. Initial Baseline

- Push the workflow file on a PR and let it run
- All stories snapshot as "new" on first run — Chromatic auto-accepts them as the initial baseline
- Subsequent PRs diff against this baseline

---

## Files Changed

| File | Change |
|---|---|
| `package.json` | Add `"storybook"` script |
| `.github/workflows/chromatic.yml` | New workflow file |

No storybook config, story files, or client package changes required.
