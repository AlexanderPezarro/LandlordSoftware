---
name: subagent-driven-development
description: Use when executing implementation tasks in the current session. Dispatches a fresh subagent per task with two-stage review.
---

# Subagent-Driven Development

Execute implementation tasks by dispatching a fresh subagent per task, with two-stage review after each: spec compliance review first, then code quality review.

**Core principle:** Fresh subagent per task + two-stage review (spec then quality) = high quality, fast iteration

## When to Use

- Tasks have been created (via `writing-plans` skill using `TaskCreate`)
- Tasks are mostly independent (or dependencies are set up)
- You want to stay in this session

**If no tasks exist:** Use `writing-plans` first to create them.

## The Process

```
For each task:
  1. Find pending task (TaskList)
  2. Read task details (TaskGet)
  3. Claim task (TaskUpdate → in_progress)
  4. Dispatch implementer subagent (./implementer-prompt.md)
  5. Answer any implementer questions
  6. Dispatch spec reviewer (./spec-reviewer-prompt.md)
  7. If issues → implementer fixes → re-review
  8. Dispatch code quality reviewer (./code-quality-reviewer-prompt.md)
  9. If issues → implementer fixes → re-review
  10. Complete task (TaskUpdate → completed)
  11. Repeat until no pending tasks remain

After all tasks:
  → Dispatch final code reviewer for entire implementation
  → Use finishing-a-development-branch skill
```

## Workflow Commands

**Finding work:**

```
TaskList
  → Shows all tasks with status, blockedBy
  → Pick first pending task with no blockers

TaskGet
  taskId: "<id>"
  → Returns full task description (the implementer's spec)
```

**Claiming work:**

```
TaskUpdate
  taskId: "<id>"
  status: "in_progress"
```

**Completing work:**

```
TaskUpdate
  taskId: "<id>"
  status: "completed"
```

**Checking progress:**

```
TaskList
  → See which tasks are pending, in_progress, completed
  → Check blockedBy to find unblocked work
```

## Prompt Templates

- `./implementer-prompt.md` - Dispatch implementer subagent
- `./spec-reviewer-prompt.md` - Dispatch spec compliance reviewer subagent
- `./code-quality-reviewer-prompt.md` - Dispatch code quality reviewer subagent

## Example Workflow

```
You: I'm using Subagent-Driven Development to execute these tasks.

[Check available tasks]
TaskList →
  #1: "Setup database schema" (pending, no blockers)
  #2: "Create API auth middleware" (pending, no blockers)
  #3: "Implement landlord CRUD" (pending, blocked by #1)

[Get first task details]
TaskGet taskId: "1" →
  Full specification with files, steps, code examples...

[Claim the task]
TaskUpdate taskId: "1", status: "in_progress"

[Dispatch implementer subagent with task specification]

Implementer: "Before I begin - should migrations be auto-applied or manual?"

You: "Manual - we'll have a separate migration script."

Implementer: "Got it. Implementing now..."
[Later] Implementer:
  - Created schema.sql and migration
  - Added tests, 5/5 passing
  - Self-review: Found I missed index on landlord_id, added it
  - Committed

[Dispatch spec compliance reviewer with task spec]
Spec reviewer: ✅ Spec compliant - all requirements met, nothing extra

[Get git SHAs, dispatch code quality reviewer]
Code reviewer: Strengths: Good test coverage, clean. Issues: None. Approved.

[Complete the task]
TaskUpdate taskId: "1", status: "completed"

[Check for next task]
TaskList →
  #1: completed
  #2: "Create API auth middleware" (pending, no blockers)
  #3: "Implement landlord CRUD" (pending, was blocked by #1 - now unblocked)

[Get next task, claim, implement, review, complete...]
[Continue until all tasks completed]

[After all tasks complete]
[Dispatch final code-reviewer for entire implementation]
Final reviewer: All requirements met, ready to merge

Done! Use finishing-a-development-branch to complete.
```

## Advantages

**vs. Manual execution:**

- Subagents follow TDD naturally
- Fresh context per task (no confusion)
- Parallel-safe (subagents don't interfere)
- Subagent can ask questions (before AND during work)

**Quality gates:**

- Self-review catches issues before handoff
- Two-stage review: spec compliance, then code quality
- Review loops ensure fixes actually work
- Spec compliance prevents over/under-building
- Code quality ensures implementation is well-built

## Red Flags

**Never:**

- Skip reviews (spec compliance OR code quality)
- Proceed with unfixed issues
- Dispatch multiple implementation subagents in parallel (conflicts)
- Skip claiming the task (lose track of what's being worked on)
- Skip completing the task (stays in_progress forever)
- Ignore subagent questions (answer before letting them proceed)
- Accept "close enough" on spec compliance
- Skip review loops (reviewer found issues = implementer fixes = review again)
- Let implementer self-review replace actual review (both are needed)
- **Start code quality review before spec compliance is passed** (wrong order)
- Move to next task while either review has open issues

**If subagent asks questions:**

- Answer clearly and completely
- Provide additional context if needed
- Don't rush them into implementation

**If reviewer finds issues:**

- Implementer (same subagent) fixes them
- Reviewer reviews again
- Repeat until approved
- Don't skip the re-review

**If subagent fails a task:**

- Dispatch fix subagent with specific instructions
- Don't try to fix manually (context pollution)

## Integration

**Requires before this skill:**

- **writing-plans** - Creates the tasks this skill executes

**Used after this skill:**

- **finishing-a-development-branch** - Completes development, runs UAT, handles merge/PR
