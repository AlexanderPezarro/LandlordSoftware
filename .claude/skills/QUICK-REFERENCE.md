# Quick Reference: Plan Files vs Beads

## Side-by-Side Workflow Comparison

### Phase 1: Planning

| Plan Files | Beads |
|------------|-------|
| Write plan to `docs/plans/implementation-plan.md` | Create beads with `bd create` |
| Single file with all tasks | Multiple beads in database |
| Manual task numbering | Auto-generated bead IDs |
| Prose descriptions of dependencies | `bd dep add` for explicit dependencies |

**Plan Files Example:**
```markdown
### Task 1: Setup database schema
[specification]

### Task 2: Implement landlord CRUD (depends on Task 1)
[specification]
```

**Beads Example:**
```bash
bd create --title="Setup database schema" --description="[spec]"
bd create --title="Implement landlord CRUD" --description="[spec]"
bd dep add beads-abc beads-def  # CRUD depends on schema
```

### Phase 2: Finding Work

| Plan Files | Beads |
|------------|-------|
| Read entire plan file | `bd ready` |
| Extract tasks manually | Auto-filtered (unblocked only) |
| Track with TodoWrite | Track with bead status |

**Plan Files Example:**
```
Read docs/plans/implementation-plan.md
Extract Task 1, Task 2, Task 3...
Create TodoWrite with all tasks
```

**Beads Example:**
```bash
$ bd ready
beads-a3f2dd: Setup database schema (priority: 1)
beads-7b8c21: Create API authentication (priority: 1)
# Only shows unblocked beads
```

### Phase 3: Getting Task Details

| Plan Files | Beads |
|------------|-------|
| Parse from plan file | `bd show <id>` |
| Copy/paste section | Structured output |
| Manual context gathering | Dependencies listed automatically |

**Plan Files Example:**
```
Read docs/plans/implementation-plan.md
Find "### Task 1: Setup database schema"
Copy everything until next "### Task"
Provide to subagent
```

**Beads Example:**
```bash
$ bd show beads-a3f2dd
ID: beads-a3f2dd
Title: Setup database schema
Type: feature
Priority: 1
Status: open
Description:
## Overview
[Full specification here]
```

### Phase 4: Claiming Work

| Plan Files | Beads |
|------------|-------|
| Mark todo as `in_progress` | `bd update --status=in_progress` |
| Only visible in current session | Visible across all sessions |
| Lost on context clear | Persists in database |

**Plan Files Example:**
```
TodoWrite: Mark "Setup database schema" as in_progress
```

**Beads Example:**
```bash
$ bd update beads-a3f2dd --status=in_progress
```

### Phase 5: Implementation

| Plan Files | Beads |
|------------|-------|
| Same process | Same process |
| Dispatch implementer subagent | Dispatch implementer subagent |
| Provide task text from plan | Provide bead text from `bd show` |

**Both use same implementer-prompt.md template** (just different content source)

### Phase 6: Review

| Plan Files | Beads |
|------------|-------|
| Compare to plan file section | Compare to bead specification |
| Manual cross-reference | Direct reference to bead ID |

**Plan Files Example:**
```
Spec reviewer: "Check if implementation matches Task 1 in plan file"
(Must read plan file to verify)
```

**Beads Example:**
```
Spec reviewer: "Check if implementation matches beads-a3f2dd"
(Use bd show beads-a3f2dd to get spec)
```

### Phase 7: Completion

| Plan Files | Beads |
|------------|-------|
| Mark todo as `completed` | `bd close <id>` |
| Only in current session | Permanently closed in database |
| Lost on context clear | Persists across sessions |

**Plan Files Example:**
```
TodoWrite: Mark "Setup database schema" as completed
```

**Beads Example:**
```bash
$ bd close beads-a3f2dd
# Or close multiple at once
$ bd close beads-a3f2dd beads-7b8c21 beads-9d4e56
```

### Phase 8: Next Task

| Plan Files | Beads |
|------------|-------|
| Check TodoWrite for next pending | `bd ready` |
| Manual dependency checking | Auto-filtered (dependency blocking) |

**Plan Files Example:**
```
TodoWrite: Find next pending task
Check if dependencies are met (manual verification)
```

**Beads Example:**
```bash
$ bd ready
beads-9d4e56: Implement landlord CRUD (priority: 1)
# Only shows if dependencies (schema) are closed
```

## Command Cheat Sheet

### Creating Work

```bash
# Plan files
Write to docs/plans/implementation-plan.md

# Beads
bd create --title="..." --type=feature --priority=1 --description="..."
```

### Finding Work

```bash
# Plan files
cat docs/plans/implementation-plan.md
# Read and extract manually

# Beads
bd ready                     # Show ready beads
bd list --status=open       # All open (including blocked)
```

### Getting Details

```bash
# Plan files
cat docs/plans/implementation-plan.md
# Find and copy relevant section

# Beads
bd show beads-a3f2dd        # Full specification
```

### Claiming Work

```bash
# Plan files
TodoWrite: status=in_progress

# Beads
bd update beads-a3f2dd --status=in_progress
```

### Completing Work

```bash
# Plan files
TodoWrite: status=completed

# Beads
bd close beads-a3f2dd
bd close beads-a3f2dd beads-7b8c21  # Multiple at once
```

### Dependencies

```bash
# Plan files
# Prose in plan file: "Task 2 depends on Task 1"
# Manual tracking in TodoWrite

# Beads
bd dep add beads-task2 beads-task1   # task2 depends on task1
bd dep tree beads-task2              # Visualize
bd blocked                           # See what's blocked
```

### Project Health

```bash
# Plan files
# Count completed todos manually
# Re-read plan file to see what's left

# Beads
bd stats                    # Open/closed/blocked counts
bd ready                    # Available work
bd blocked                  # Blocked work
bd list --status=in_progress # Active work
```

### Session Boundaries

```bash
# Plan files
# Re-read plan file
# Recreate TodoWrite
# Lost progress if context cleared

# Beads
bd sync --from-main         # Pull latest beads
bd list --status=in_progress # Resume work
# Nothing lost on context clear
```

## Key Advantages of Beads

1. **Persistence:** Survive context clears and session boundaries
2. **Dependencies:** Automatic blocking prevents working on unavailable tasks
3. **Visibility:** `bd ready`, `bd stats`, `bd blocked` show project health
4. **Collaboration:** Multiple agents/people can work on different beads
5. **Audit trail:** Every bead tracks creation, assignment, completion
6. **Sync:** `bd sync --from-main` keeps everyone in sync
7. **No file parsing:** Structured data instead of markdown parsing

## Key Advantages of Plan Files

1. **Simple:** Just a markdown file
2. **Readable:** Human-readable plan in one place
3. **Diff-friendly:** Easy to see changes in git
4. **Portable:** No database required
5. **Familiar:** Standard markdown format

## When to Use Each

**Use Plan Files when:**
- Simple, linear implementation
- Single developer/agent
- Short session (won't hit context limits)
- Don't need dependency tracking
- Want simple, readable plan document

**Use Beads when:**
- Complex dependency trees
- Multiple parallel work streams
- Long-running implementations
- Multiple sessions/developers
- Need project health visibility
- Want automatic dependency blocking
- Working across context clears
