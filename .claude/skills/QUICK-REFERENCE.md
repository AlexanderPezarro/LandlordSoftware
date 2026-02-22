# Quick Reference: Skills Workflow

## Pipeline at a Glance

| Step | Skill | Input | Output |
|------|-------|-------|--------|
| 1 | `brainstorming` | Idea | `*-design.md` |
| 2 | `writing-user-stories` | Design doc | `*-user-stories.md` |
| 3a | `writing-plans` | User stories | `*-implementation-plan.md` + tasks |
| 3b | `writing-uat-plan` | User stories | `*-uat-plan.md` |
| 4 | `subagent-driven-development` | Tasks | Implemented code |
| 5 | `finishing-a-development-branch` | Code + UAT plan | Merged/PR'd work |

Steps 3a and 3b can run in parallel.

## Per-Skill Quick Reference

### brainstorming
```
Trigger: Before any creative work
Process: Ask questions → propose approaches → present design in sections → validate
Output:  docs/plans/YYYY-MM-DD-<topic>-design.md
Next:    writing-user-stories
```

### writing-user-stories
```
Trigger: After design doc is validated
Process: Identify roles/epics → write stories incrementally → validate → commit
Format:  "As a <role>, I want <feature>, so that <benefit>" + acceptance criteria
Output:  docs/plans/YYYY-MM-DD-<topic>-user-stories.md
Next:    writing-plans + writing-uat-plan
```

### writing-plans
```
Trigger: After user stories are written
Process: Break stories into tasks → write plan doc → TaskCreate for each → set dependencies
Output:  docs/plans/YYYY-MM-DD-<topic>-implementation-plan.md + tasks
Next:    subagent-driven-development
```

### writing-uat-plan
```
Trigger: After user stories are written (parallel with writing-plans)
Process: For each story → concrete UAT scenarios with steps, expected results, edge cases
Output:  docs/plans/YYYY-MM-DD-<topic>-uat-plan.md
Used by: verify-app (UAT mode), finishing-a-development-branch
```

### subagent-driven-development
```
Trigger: After tasks are created
Process: For each task:
         TaskList → TaskGet → TaskUpdate(in_progress)
         → dispatch implementer → spec review → code quality review
         → TaskUpdate(completed)
Next:    finishing-a-development-branch
```

### finishing-a-development-branch
```
Trigger: After all tasks complete
Process: 1. Run unit tests
         2. Run UAT (verify-app with UAT plan)
         3. If UAT fails → create fix tasks → implement → re-run UAT (max 3 loops)
         4. Present options: merge / PR / keep / discard
```

### verify-app
```
Trigger: Called by finishing-a-development-branch, or standalone
Modes:   UAT mode (if *-uat-plan.md exists) or Default mode (key pages)
Output:  docs/verification-report.md with screenshots + structured pass/fail results
```

## Task System Commands

| Action | Tool | Key Fields |
|--------|------|------------|
| Create | `TaskCreate` | `subject`, `description`, `activeForm` |
| List | `TaskList` | Returns all tasks with status, blockedBy |
| Details | `TaskGet` | `taskId` → full description |
| Claim | `TaskUpdate` | `taskId`, `status: "in_progress"` |
| Complete | `TaskUpdate` | `taskId`, `status: "completed"` |
| Dependencies | `TaskUpdate` | `taskId`, `addBlockedBy: ["id"]` |

## Document Naming

```
docs/plans/YYYY-MM-DD-<topic>-design.md
docs/plans/YYYY-MM-DD-<topic>-user-stories.md
docs/plans/YYYY-MM-DD-<topic>-implementation-plan.md
docs/plans/YYYY-MM-DD-<topic>-uat-plan.md
docs/verification-report.md
```
