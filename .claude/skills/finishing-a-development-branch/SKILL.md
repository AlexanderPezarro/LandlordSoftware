---
name: finishing-a-development-branch
description: Use when implementation is complete and all tasks are done. Runs UAT verification, fixes failures automatically, then guides completion with structured options for merge, PR, or cleanup.
---

# Finishing a Development Branch

## Overview

Guide completion of development work: verify tests pass, run UAT against the UAT plan, fix any failures, then present options for integration.

**Core principle:** Tests pass → UAT passes (with fix loop) → Present options → Execute choice → Clean up.

**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

## The Process

### Step 1: Verify Unit Tests

**Before anything else, verify tests pass:**

```bash
npm test
```

**If tests fail:**

```
Tests failing (<N> failures). Must fix before completing:

[Show failures]

Cannot proceed until tests pass.
```

Stop. Don't proceed to Step 2.

**If tests pass:** Continue to Step 2.

### Step 2: Run UAT Verification

**Find the UAT plan:**

Look for the most recent UAT plan in `docs/plans/` matching `*-uat-plan.md`. If none exists, skip to Step 3 (present options without UAT).

**Dispatch a subagent to execute UAT:**

```
Task tool (general-purpose):
  description: "Execute UAT plan"
  prompt: |
    You are executing the UAT plan to verify the implementation works end-to-end.

    Use the verify-app skill in UAT mode:
    - Read the UAT plan at: {path to UAT plan doc}
    - Start the app if not running (npm run dev, seed if needed)
    - For each UAT scenario in the plan:
      1. Follow the preconditions and setup
      2. Execute each step using Rodney browser automation
      3. Verify expected results
      4. Screenshot each key state
      5. Record PASS or FAIL for each scenario
    - Produce a verification report at docs/verification-report.md

    Report back with:
    - Total scenarios: N
    - Passed: N
    - Failed: N
    - For each failure: UAT ID, scenario title, which step failed, what happened vs expected
```

### Step 3: Handle UAT Results

**If all UAT passes:**

Produce a success report and proceed to Step 4 (present options).

```
UAT Verification: ✅ All N scenarios passed.

Report: docs/verification-report.md
```

**If any UAT fails — enter the fix loop:**

```
UAT Verification: ❌ N of M scenarios failed.

Failures:
- UAT-003: <scenario> — Step 4 failed: expected <X>, got <Y>
- UAT-007: <scenario> — Step 2 failed: element not found
```

**Fix loop process:**

1. **Create fix tasks** for each failure using `TaskCreate`:

```
TaskCreate:
  subject: "Fix UAT-003: <scenario title>"
  description: |
    UAT scenario UAT-003 failed during verification.

    **Failure:** Step 4 — expected <X>, got <Y>
    **User Story:** US-<number>
    **Root cause investigation needed.**

    Steps to reproduce:
    1. <steps from UAT plan>

    Expected: <what should happen>
    Actual: <what happened>

    Fix the implementation so this UAT scenario passes.
  activeForm: "Fixing UAT-003"
```

2. **Use subagent-driven-development** to implement the fixes:
   - Dispatch implementer subagent per fix task
   - Spec review (does the fix address the UAT failure?)
   - Code quality review
   - Complete task

3. **Re-run UAT** — go back to Step 2

4. **Repeat** until all UAT scenarios pass

**Safety limit:** If the fix loop has run 3 times without all UAT passing, stop and report to the user:

```
UAT fix loop has run 3 times. Remaining failures:
- UAT-003: <details>

Please review manually. The failures may indicate a design issue rather than an implementation bug.
```

### Step 4: Determine Base Branch

```bash
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

Or ask: "This branch split from main - is that correct?"

### Step 5: Present Options

Present exactly these 4 options:

```
Implementation complete. UAT passed. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

**Don't add explanation** - keep options concise.

### Step 6: Execute Choice

#### Option 1: Merge Locally

```bash
git checkout <base-branch>
git pull
git merge <feature-branch>
<test command>
git branch -d <feature-branch>
```

Then: Cleanup worktree (Step 7)

#### Option 2: Push and Create PR

```bash
git push -u origin <feature-branch>

gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
<2-3 bullets of what changed>

## UAT Results
All N scenarios passed. See docs/verification-report.md.

## Test Plan
- [ ] <verification steps>
EOF
)"
```

Then: Cleanup worktree (Step 7)

#### Option 3: Keep As-Is

Report: "Keeping branch <name>. Worktree preserved at <path>."

**Don't cleanup worktree.**

#### Option 4: Discard

**Confirm first:**

```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

Wait for exact confirmation.

If confirmed:

```bash
git checkout <base-branch>
git branch -D <feature-branch>
```

Then: Cleanup worktree (Step 7)

### Step 7: Cleanup Worktree

**For Options 1, 2, 4:**

Check if in worktree:

```bash
git worktree list | grep $(git branch --show-current)
```

If yes:

```bash
git worktree remove <worktree-path>
```

**For Option 3:** Keep worktree.

## Quick Reference

| Step | Action | Condition |
|------|--------|-----------|
| 1 | Run unit tests | Always |
| 2 | Run UAT | If UAT plan exists |
| 3 | Fix loop | If UAT failures |
| 4 | Determine base branch | After UAT passes |
| 5 | Present 4 options | Always |
| 6 | Execute choice | User selects |
| 7 | Cleanup worktree | Options 1, 2, 4 |

| Option | Merge | Push | Keep Worktree | Cleanup Branch |
|--------|-------|------|---------------|----------------|
| 1. Merge locally | yes | - | - | yes |
| 2. Create PR | - | yes | yes | - |
| 3. Keep as-is | - | - | yes | - |
| 4. Discard | - | - | - | yes (force) |

## Common Mistakes

**Skipping UAT** - If a UAT plan exists, always run it before presenting options.

**Infinite fix loop** - Cap at 3 iterations. Persistent failures likely need human review.

**Skipping test verification** - Always verify unit tests before offering options.

**No confirmation for discard** - Require typed "discard" confirmation.

## Red Flags

**Never:**

- Proceed with failing unit tests
- Skip UAT when a UAT plan exists
- Merge without verifying tests on result
- Delete work without confirmation
- Force-push without explicit request
- Let the fix loop run more than 3 times without human input

**Always:**

- Verify unit tests before anything else
- Run UAT if a plan exists
- Present exactly 4 options
- Get typed confirmation for Option 4
- Clean up worktree for Options 1 & 4 only
- Include UAT results in PR description (Option 2)

## Integration

**Called by:**

- **subagent-driven-development** - After all tasks complete

**Uses:**

- **verify-app** - Executes UAT scenarios (in UAT mode)
- **subagent-driven-development** - Implements fix tasks when UAT fails

**Pairs with:**

- **using-git-worktrees** - Cleans up worktree created by that skill
