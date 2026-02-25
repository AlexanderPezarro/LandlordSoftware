# Implementation Plan: Storybook + Chromatic Integration

**User stories:** docs/plans/2026-02-25-storybook-chromatic-user-stories.md
**Design:** docs/plans/2026-02-25-storybook-chromatic-design.md
**Date:** 2026-02-25

## Context

- Storybook is already installed in `client/` (`@storybook/react-vite`, `@chromatic-com/storybook`)
- `client/package.json` already has `"storybook": "storybook dev -p 6006"` and `"build-storybook": "storybook build"`
- Stories already exist for all components in `client/src/components/primitives/` and `client/src/components/composed/`
- Storybook config is at `client/.storybook/main.ts` — already includes `@chromatic-com/storybook` addon
- GitHub repo: `AlexanderPezarro/LandlordSoftware`
- Existing CI workflows in `.github/workflows/`: `deploy-main.yml`, `deploy-pr.yml`

## Task Overview

| # | Task | User Story | Dependencies | Complexity |
|---|------|------------|--------------|------------|
| 1 | Add root storybook npm script | US-001 | none | Small |
| 2 | Create Chromatic GitHub Actions workflow | US-002, US-003, US-004, US-005, US-006, US-007 | Task 1 | Medium |

---

## Tasks

### Task 1: Add root storybook npm script

**User Story:** US-001
**Dependencies:** none

#### Overview

Add `"storybook"` to the root `package.json` scripts so developers can run `npm run storybook` from the repo root without navigating to `client/`. The client already has the script; this just delegates to it.

#### Files

- Modify: `package.json`

#### Implementation Steps

**Step 1: Add the script**

Open `package.json`. In the `"scripts"` object, add after `"dev:client"`:

```json
"storybook": "cd client && npm run storybook",
```

The scripts section should now look like:

```json
"scripts": {
  "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
  "dev:server": "tsx server/src/server.ts",
  "dev:client": "cd client && npm run dev",
  "storybook": "cd client && npm run storybook",
  "build": "npm run build:client && npm run build:server",
  ...
}
```

**Step 2: Verify**

Run from the repo root:
```bash
npm run storybook
```

Expected: Storybook dev server starts and prints something like:
```
Storybook 10.x started
  Local:            http://localhost:6006/
```

Open http://localhost:6006 in a browser. You should see all component stories listed in the sidebar (Button, Card, TextField, Badge, Avatar, etc.).

Press Ctrl+C to stop.

**Step 3: Commit**

```bash
git add package.json
git commit -m "feat: add root-level storybook npm script"
```

#### Verification

`npm run storybook` from the repo root starts the dev server on port 6006 and all stories are browsable.

---

### Task 2: Create Chromatic GitHub Actions workflow

**User Story:** US-002, US-003, US-004, US-005, US-006, US-007
**Dependencies:** Task 1

#### Overview

Create `.github/workflows/chromatic.yml`. This workflow:
- Triggers on every PR (open, sync, reopen) — builds Storybook and runs Chromatic visual regression
- Triggers on every push to `main` — publishes new baseline, auto-accepts changes
- Posts a PR comment with the Chromatic build URL
- Fails the PR check if there are unreviewed visual changes (blocks merge)
- Cancels in-progress runs when a new commit is pushed to the same branch

US-006 (Chromatic project + GitHub secret) and US-007 (branch protection) are manual one-time steps documented at the end of this task.

#### Files

- Create: `.github/workflows/chromatic.yml`

#### Implementation Steps

**Step 1: Create the workflow file**

Create `.github/workflows/chromatic.yml` with the following content:

```yaml
name: Chromatic

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  pull-requests: write

concurrency:
  group: chromatic-${{ github.ref }}
  cancel-in-progress: true

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install root dependencies
        run: npm ci

      - name: Install client dependencies
        run: cd client && npm ci

      - name: Build Storybook
        run: cd client && npm run build-storybook

      - name: Publish to Chromatic
        id: chromatic
        uses: chromaui/action@v11
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          storybookBuildDir: client/storybook-static
          autoAcceptChanges: main
          exitZeroOnChanges: false
          onlyChanged: true

      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const buildUrl = '${{ steps.chromatic.outputs.buildUrl }}';
            const marker = '<!-- chromatic-comment -->';

            const body = [
              marker,
              '**Chromatic build ready!**',
              '',
              '| | |',
              '|---|---|',
              `| **Storybook** | ${buildUrl} |`,
              `| **Commit** | \`${context.sha.substring(0, 7)}\` |`,
            ].join('\n');

            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });
            const existing = comments.find(c => c.body.includes(marker));

            if (existing) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: existing.id,
                body,
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body,
              });
            }
```

**Key options explained:**
- `fetch-depth: 0` — Chromatic needs full git history to determine which stories changed
- `autoAcceptChanges: main` — on pushes to main, visual changes are auto-accepted (sets new baseline)
- `exitZeroOnChanges: false` — the step fails if there are unreviewed visual changes on a PR
- `onlyChanged: true` — only snapshots stories that changed in the diff (faster)
- `storybookBuildDir: client/storybook-static` — points to the pre-built output directory

**Step 2: Commit**

```bash
git add .github/workflows/chromatic.yml
git commit -m "feat: add Chromatic visual regression CI workflow"
```

**Step 3: One-time manual setup (US-006)**

These steps are performed once by the repo owner and are NOT automated:

1. Go to https://www.chromatic.com and sign in with GitHub
2. Click "Add project" → select `AlexanderPezarro/LandlordSoftware`
3. Copy the generated project token (starts with `chpt_`)
4. In the GitHub repo: Settings → Secrets and variables → Actions → New repository secret
   - Name: `CHROMATIC_PROJECT_TOKEN`
   - Value: the token from step 3

**Step 4: Establish the initial baseline (US-006)**

Push this branch as a PR. The workflow will run, snapshot all stories for the first time, and auto-accept them as the initial baseline (since all stories are "new", not "changed"). All subsequent PRs diff against this baseline.

**Step 5: Enable branch protection (US-007)**

After the workflow has run at least once on a PR:

1. GitHub repo → Settings → Branches → Add branch protection rule
2. Branch name pattern: `main`
3. Enable "Require status checks to pass before merging"
4. Search for and add `chromatic` as a required status check
5. Save

Note: the `chromatic` status check only appears in the search after the workflow has run at least once.

#### Verification

- Push a commit to a PR. The workflow runs and a PR comment appears with a Chromatic build URL.
- Open the Chromatic URL — all stories are visible.
- If no visual changes: the `chromatic` status check shows green.
- If visual changes exist: the status check shows red until changes are accepted in Chromatic.
- Push to `main`: the workflow runs and publishes a new baseline without failing.
