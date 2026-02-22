---
name: writing-plans
description: Use when you have user stories ready and need to create an implementation plan. Reads user stories, produces an implementation plan document and creates tasks via TaskCreate.
---

# Creating Implementation Plans

## Overview

Create a comprehensive implementation plan from user stories. Each task contains everything an implementer needs: which files to touch, code examples, testing steps, and how to verify it works. The plan is written as a markdown document AND tasks are created using the inbuilt task system (`TaskCreate`).

Assume the implementer has zero context for the codebase and questionable taste. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan from the user stories."

## The Process

### Step 1: Read the User Stories

- Find the user stories doc in `docs/plans/` (or ask the user which one)
- Read the design doc it references for additional context
- Identify all features, dependencies, and implementation order

### Step 2: Plan the Task Tree

- Break each user story into implementation tasks (15-30 minutes each)
- Identify dependencies between tasks
- Plan order: foundation tasks first (database, auth, core models), then features, then UI
- Each task should be independently verifiable and a complete, shippable unit

### Step 3: Write the Implementation Plan Document

Write to `docs/plans/YYYY-MM-DD-<topic>-implementation-plan.md`:

```markdown
# Implementation Plan: <Topic>

**User stories:** docs/plans/YYYY-MM-DD-<topic>-user-stories.md
**Design:** docs/plans/YYYY-MM-DD-<topic>-design.md
**Date:** YYYY-MM-DD

## Task Overview

| # | Task | User Story | Dependencies | Complexity |
|---|------|------------|--------------|------------|
| 1 | ... | US-001 | none | Small |
| 2 | ... | US-001 | Task 1 | Medium |

## Tasks

### Task 1: <title>

**User Story:** US-<number>
**Dependencies:** none

#### Overview
[What this task implements and why]

#### Files
- Create: `exact/path/to/file.ts`
- Modify: `exact/path/to/existing.ts`
- Test: `exact/path/to/test.ts`

#### Implementation Steps

**Step 1: Write the failing test**
```typescript
// exact test code
```
Run: `npm test -- --testPathPattern=path/to/test`
Expected: FAIL

**Step 2: Write minimal implementation**
```typescript
// exact implementation code
```

**Step 3: Verify tests pass**
Run: `npm test -- --testPathPattern=path/to/test`
Expected: PASS

**Step 4: Commit**
```bash
git add <files>
git commit -m "feat: <message>"
```

#### Verification
[How to verify this task is complete]
```

### Step 4: Create Tasks

For each task in the plan, create a task using the inbuilt task system:

```
TaskCreate:
  subject: "Task 1: <title>"
  description: |
    <Full task specification from the plan document -
    everything the implementer needs including files,
    code examples, test steps, commit instructions>
  activeForm: "Implementing <short description>"
```

After creating all tasks, set up dependencies:

```
TaskUpdate:
  taskId: "2"
  addBlockedBy: ["1"]   # Task 2 depends on Task 1
```

### Step 5: Commit the Plan

- Commit the implementation plan document to git
- Report: "Implementation plan created with N tasks. Ready for subagent-driven-development."

## Task Granularity

**Each task is a cohesive feature (15-30 minutes):**

- Group related test-write-test-commit cycles into one task
- Each task should be independently verifiable
- Each task should be a complete, shippable unit

**Task description contains:**

- Clear title describing what will be implemented
- User story reference
- Complete task description with all steps
- Files to create/modify with exact paths
- Code examples for implementation
- Test steps with expected output
- Commit instructions

## Key Principles

- **Exact file paths always** - Never say "add to the routes file"
- **Complete code in description** - Not "add validation" but the actual code
- **Exact commands with expected output** - Implementer should know what success looks like
- **DRY, YAGNI, TDD, frequent commits**
- **Each task description must be complete and standalone** - Implementer only sees their task

## Integration

**Requires before this skill:**

- **writing-user-stories** - Produces the user stories this skill reads

**Next in workflow:**

- **subagent-driven-development** - Executes the tasks
- **writing-uat-plan** - Can run in parallel to produce UAT plan from the same user stories
