# Skills Workflow

These skills provide a structured workflow for feature development, from initial idea through to verified, merged code.

## Workflow Pipeline

```
brainstorming
    ↓ produces design doc
writing-user-stories
    ↓ produces user stories doc
    ├── writing-plans        → implementation plan doc + tasks (TaskCreate)
    └── writing-uat-plan     → UAT plan doc
subagent-driven-development
    ↓ executes tasks with review
finishing-a-development-branch
    ↓ runs UAT (verify-app), fix loop if needed
    ↓ merge / PR / keep / discard
```

## Skills

### 1. brainstorming

Turn ideas into fully formed designs through collaborative dialogue.

- **Input:** An idea or feature request
- **Output:** `docs/plans/YYYY-MM-DD-<topic>-design.md`
- **Next:** `writing-user-stories`

### 2. writing-user-stories

Convert a design document into user stories with acceptance criteria.

- **Input:** Design document from brainstorming
- **Output:** `docs/plans/YYYY-MM-DD-<topic>-user-stories.md`
- **Next:** `writing-plans` and `writing-uat-plan` (can run in parallel)

### 3. writing-plans

Create implementation plan and tasks from user stories.

- **Input:** User stories document
- **Output:** `docs/plans/YYYY-MM-DD-<topic>-implementation-plan.md` + tasks via `TaskCreate`
- **Next:** `subagent-driven-development`

### 4. writing-uat-plan

Create detailed UAT scenarios from user stories.

- **Input:** User stories document
- **Output:** `docs/plans/YYYY-MM-DD-<topic>-uat-plan.md`
- **Used by:** `verify-app` (UAT mode) and `finishing-a-development-branch`

### 5. subagent-driven-development

Execute tasks by dispatching a fresh subagent per task with two-stage review.

- **Input:** Tasks created by `writing-plans`
- **Process:** For each task: implement → spec review → code quality review → complete
- **Next:** `finishing-a-development-branch`

### 6. finishing-a-development-branch

Verify tests, run UAT, fix failures, then present integration options.

- **Process:** Unit tests → UAT (via `verify-app`) → fix loop if needed → merge/PR/keep/discard
- **Uses:** `verify-app` for UAT execution, `subagent-driven-development` for fix tasks

### 7. verify-app

Visual verification of the running application.

- **UAT mode:** Executes scenarios from UAT plan, reports pass/fail per scenario
- **Default mode:** Navigates key pages and verifies they load
- **Output:** `docs/verification-report.md` with screenshots

## Task System

Skills use the inbuilt task system for tracking implementation work:

| Action | Tool | Usage |
|--------|------|-------|
| Create task | `TaskCreate` | `subject`, `description`, `activeForm` |
| List tasks | `TaskList` | Shows all tasks with status and blockers |
| Get details | `TaskGet` | Full task description by ID |
| Update task | `TaskUpdate` | Change status, add dependencies |

**Status flow:** `pending` → `in_progress` → `completed`

**Dependencies:** Use `TaskUpdate` with `addBlockedBy`/`addBlocks` to set up task ordering.

## Document Convention

All planning documents live in `docs/plans/` with the naming pattern:

```
docs/plans/YYYY-MM-DD-<topic>-design.md
docs/plans/YYYY-MM-DD-<topic>-user-stories.md
docs/plans/YYYY-MM-DD-<topic>-implementation-plan.md
docs/plans/YYYY-MM-DD-<topic>-uat-plan.md
```
