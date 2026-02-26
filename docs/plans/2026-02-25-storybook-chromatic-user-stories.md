# User Stories: Storybook + Chromatic Integration

**Design document:** docs/plans/2026-02-25-storybook-chromatic-design.md
**Date:** 2026-02-25

## Roles

- **Developer** — writes component code, opens PRs, reviews visual diffs
- **Repo owner** — performs one-time Chromatic setup and configures branch protection

---

## Epic: Local Development

### US-001: Run Storybook from repo root

**As a** developer, **I want** to run `npm run storybook` from the repo root, **so that** I can browse component stories without navigating to the client directory.

**Acceptance Criteria:**
- [ ] `npm run storybook` is available in the root `package.json`
- [ ] Running it starts Storybook dev server on port 6006
- [ ] All stories in `client/src/components/` are visible in the browser

**Priority:** High
**Complexity:** Small
**Epic:** Local Development

---

## Epic: CI Integration

### US-002: Chromatic build on pull request

**As a** developer, **I want** Chromatic to automatically build and publish my Storybook when I open or update a PR, **so that** visual diffs against the baseline are available for review.

**Acceptance Criteria:**
- [ ] A Chromatic build triggers on every PR open, push, and reopen
- [ ] The build installs root and client dependencies, builds Storybook, then runs Chromatic
- [ ] Only stories affected by the diff are snapshotted (`onlyChanged: true`)
- [ ] If a previous build is in progress for the same PR, it is cancelled when a new commit is pushed

**Priority:** High
**Complexity:** Medium
**Epic:** CI Integration

---

### US-003: Blocked merge on unreviewed visual changes

**As a** repo owner, **I want** PRs with unreviewed visual changes to fail the Chromatic status check, **so that** UI changes cannot be merged without deliberate sign-off.

**Acceptance Criteria:**
- [ ] The Chromatic workflow exits non-zero when unreviewed visual changes are detected
- [ ] The PR merge button is disabled until the Chromatic check passes
- [ ] Approving changes in the Chromatic UI causes the status check to pass
- [ ] PRs with no visual changes pass the check automatically

**Priority:** High
**Complexity:** Small
**Epic:** CI Integration

---

### US-004: PR comment with Chromatic build URL

**As a** developer, **I want** a PR comment posted with the Chromatic build URL when the workflow completes, **so that** I can navigate directly to the visual diff without searching Chromatic.

**Acceptance Criteria:**
- [ ] A comment is posted on the PR with the Chromatic build URL after each build
- [ ] If a comment already exists it is updated rather than a new one posted
- [ ] The comment includes the commit SHA

**Priority:** Medium
**Complexity:** Small
**Epic:** CI Integration

---

### US-005: Main branch baseline update

**As a** developer, **I want** pushing to `main` to publish a new Chromatic baseline and auto-accept all changes, **so that** previously reviewed changes don't require re-approval after merging.

**Acceptance Criteria:**
- [ ] A Chromatic build triggers on every push to `main`
- [ ] Visual changes on `main` are auto-accepted (`autoAcceptChanges: main`)
- [ ] The published build becomes the new baseline for subsequent PRs

**Priority:** High
**Complexity:** Small
**Epic:** CI Integration

---

## Epic: Setup & Configuration

### US-006: Chromatic project and GitHub secret

**As a** repo owner, **I want** a Chromatic project linked to the GitHub repo with its token stored as a secret, **so that** the CI workflow can authenticate with Chromatic.

**Acceptance Criteria:**
- [ ] A Chromatic project exists at chromatic.com linked to `AlexanderPezarro/LandlordSoftware`
- [ ] The project token is stored as `CHROMATIC_PROJECT_TOKEN` in GitHub Actions secrets
- [ ] The Chromatic workflow authenticates successfully using the secret

**Priority:** High
**Complexity:** Small
**Epic:** Setup & Configuration

---

### US-007: Chromatic as required status check on main

**As a** repo owner, **I want** the Chromatic check configured as a required status check on the `main` branch, **so that** the branch protection rule enforces visual review before merging.

**Acceptance Criteria:**
- [ ] A branch protection rule exists for `main` requiring status checks to pass
- [ ] The `chromatic` status check is listed as required
- [ ] A PR with a failing Chromatic check cannot be merged via the GitHub UI

**Priority:** High
**Complexity:** Small
**Epic:** Setup & Configuration

---

## Summary

| ID | Story | Priority | Complexity | Epic |
|----|-------|----------|------------|------|
| US-001 | Run Storybook from repo root | High | Small | Local Development |
| US-002 | Chromatic build on pull request | High | Medium | CI Integration |
| US-003 | Blocked merge on unreviewed visual changes | High | Small | CI Integration |
| US-004 | PR comment with Chromatic build URL | Medium | Small | CI Integration |
| US-005 | Main branch baseline update | High | Small | CI Integration |
| US-006 | Chromatic project and GitHub secret | High | Small | Setup & Configuration |
| US-007 | Chromatic as required status check on main | High | Small | Setup & Configuration |
