# Custom Superpowers Skills - Beads Integration

These are modified versions of the superpowers skills that use **beads** (via `bd` CLI) instead of implementation plan files.

## Overview

The standard superpowers workflow uses a plan file approach:

1. brainstorming → design doc
2. writing-plans → creates `implementation-plan.md` file
3. subagent-driven-development → reads plan, extracts tasks, uses TodoWrite

The **beads workflow** replaces plan files with persistent, dependency-tracked beads:

1. brainstorming → design doc
2. **writing-plans → creates beads with `bd create`**
3. **subagent-driven-development → uses `bd ready` to get next bead**

## Why Beads?

**Persistence:** Beads survive context clearing, session boundaries, and git operations
**Dependencies:** Automatic blocking - can't work on a bead until its dependencies are complete
**Collaboration:** Multiple developers/agents can work on different beads simultaneously
**Visibility:** `bd stats`, `bd blocked`, `bd ready` provide project health at a glance
**Audit trail:** Each bead tracks status, assignee, creation date, and completion

## Workflow

### 1. Brainstorming (unchanged)

```
Use: superpowers:brainstorming
Output: docs/plans/YYYY-MM-DD-<topic>-design.md
```

### 2. Writing Plans (modified to use beads)

```
Use: custom-skills/writing-plans
Process:
  - Read design document
  - Create beads using bd create with full specifications
  - Set up dependencies with bd dep add
  - Use parallel subagents to create many beads efficiently

Output: Beads in .beads/*.db
```

**Example:**

```bash
# Create foundation bead
bd create --title="Setup database schema" \
  --type=feature \
  --priority=1 \
  --description="[Full multi-line specification with files, steps, code examples]"

# Create dependent bead
bd create --title="Implement landlord CRUD" \
  --type=feature \
  --priority=1 \
  --description="[Full specification]"

# Link them
bd dep add beads-abc123 beads-def456  # CRUD depends on schema
```

### 3. Subagent-Driven Development (modified to use beads)

```
Use: custom-skills/subagent-driven-development
Process:
  - Find ready bead: bd ready
  - Get bead spec: bd show <id>
  - Claim bead: bd update <id> --status=in_progress
  - Dispatch implementer with bead spec
  - Spec compliance review (compare to bead)
  - Code quality review
  - Close bead: bd close <id>
  - Repeat

Output: Implemented code, closed beads
```

**Loop:**

```
while bd ready returns beads:
  1. Get next ready bead
  2. Claim it (bd update --status=in_progress)
  3. Implement (dispatch subagent)
  4. Review (spec compliance, then code quality)
  5. Close it (bd close <id>)
```

### 4. Code Review & Completion (unchanged)

```
Use: superpowers:requesting-code-review
Use: superpowers:finishing-a-development-branch
```

## Modified Files

### writing-plans/SKILL.md

- **Changed:** Creates beads with `bd create` instead of writing plan file
- **Added:** Instructions for parallel bead creation with subagents
- **Added:** Dependency setup with `bd dep add`
- **Added:** Bead structure template with full specification format

### subagent-driven-development/SKILL.md

- **Changed:** Uses `bd ready` to find work instead of reading plan file
- **Changed:** Uses `bd show <id>` to get specification instead of parsing file
- **Changed:** Uses `bd update --status=in_progress` instead of TodoWrite
- **Changed:** Uses `bd close <id>` instead of marking todo complete
- **Added:** Beads workflow commands reference
- **Added:** Session boundary handling with `bd sync --from-main`

### subagent-driven-development/implementer-prompt.md

- **Changed:** Receives bead specification from `bd show <id>` instead of plan file excerpt
- **Added:** Bead ID tracking in report format
- **Updated:** Context section to reference bead dependencies

### subagent-driven-development/spec-reviewer-prompt.md

- **Changed:** Compares implementation against bead specification instead of plan task
- **Added:** Bead ID tracking in report format
- **Updated:** References to "bead" instead of "task" throughout

### subagent-driven-development/code-quality-reviewer-prompt.md

- **Changed:** References bead specification in PLAN_OR_REQUIREMENTS field
- **Updated:** Example to show bead-based approach

## Installation

These are custom skills for your project. To use them:

**Option 1: Local invocation (temporary)**

```
# Manually read and follow the skill file
# Useful for testing before committing to the approach
```

**Option 2: Custom skill plugin (persistent)**

```
# Create custom superpowers plugin
mkdir -p ~/.claude/plugins/my-superpowers/skills
cp -r custom-skills/* ~/.claude/plugins/my-superpowers/skills/

# Edit your Claude Code config to load custom plugin
# (exact steps depend on plugin system)
```

**Option 3: Fork superpowers (advanced)**

```
# Fork the superpowers repository
# Replace the skills with these versions
# Install your fork as a plugin
```

## Key Differences from Standard Superpowers

| Aspect                | Standard                 | Beads-Based            |
| --------------------- | ------------------------ | ---------------------- |
| **Storage**           | Plan file                | SQLite database        |
| **Persistence**       | File must exist          | Survives context clear |
| **Dependencies**      | Manual tracking          | Automatic blocking     |
| **Finding work**      | Read file, extract tasks | `bd ready`             |
| **Task info**         | Parse from file          | `bd show <id>`         |
| **Progress tracking** | TodoWrite                | `bd update --status`   |
| **Completion**        | Mark todo done           | `bd close <id>`        |
| **Multi-session**     | Re-read plan file        | `bd sync --from-main`  |
| **Collaboration**     | File conflicts           | SQLite JSONL sync      |

## Beads Commands Reference

### Finding Work

```bash
bd ready                      # Show unblocked, open beads
bd list --status=open        # All open beads (including blocked)
bd list --status=in_progress # Active work
bd show <id>                 # Full bead specification
```

### Managing Work

```bash
bd update <id> --status=in_progress  # Claim bead
bd close <id>                        # Complete bead
bd close <id1> <id2> <id3>          # Complete multiple beads
bd close <id> --reason="..."        # Complete with reason
```

### Project Health

```bash
bd stats           # Open/closed/blocked counts
bd blocked         # Show all blocked beads
bd dep tree <id>   # Visualize dependencies
bd dep cycles      # Detect circular dependencies
```

### Collaboration

```bash
bd sync --from-main   # Pull latest beads from main branch
bd sync --status      # Check sync status
```

## Example Session

```bash
# Start with design doc from brainstorming
$ cat docs/plans/2026-01-12-landlord-system-design.md

# Create beads from design (writing-plans skill)
$ bd create --title="Setup database schema" --type=feature --priority=1 \
  --description="$(cat <<'EOF'
## Overview
[Full specification with files, steps, code examples]
EOF
)"

# Find ready work
$ bd ready
beads-a3f2dd: Setup database schema (priority: 1)

# Get specification
$ bd show beads-a3f2dd
[Full specification displayed]

# Claim work
$ bd update beads-a3f2dd --status=in_progress

# Implement (dispatch subagent with specification)
[Implementer subagent does the work]

# Review (spec compliance, then code quality)
[Reviewer subagents check the work]

# Complete
$ bd close beads-a3f2dd

# Find next work
$ bd ready
beads-7b8c21: Create API authentication (priority: 1)
beads-9d4e56: Implement landlord CRUD (priority: 1)

# Repeat...
```

## Session Close Protocol

Before ending a session, always:

```bash
# 1. Check what changed
git status

# 2. Stage code changes
git add <files>

# 3. Pull latest beads from main
bd sync --from-main

# 4. Commit code changes
git commit -m "..."

# Note: Beads auto-sync via JSONL (no manual export needed)
```

## Tips

**Creating many beads:**

- Use `superpowers:dispatching-parallel-agents` to create beads in parallel
- Each subagent creates one bead with full specification
- Much faster than creating beads sequentially

**Bead descriptions:**

- Include complete specification (don't reference plan file)
- Include all code examples
- Include exact file paths
- Include verification steps
- Be thorough - implementer subagent gets only this text

**Dependencies:**

- Set up dependencies during bead creation
- Use `bd dep tree` to visualize before starting
- Foundation beads first (database, auth, core models)
- Feature beads next (CRUD operations, business logic)
- UI beads last (components, pages, forms)

**Priority levels:**

- 0 = Critical (blockers, security, data loss)
- 1 = High (core features, important bugs)
- 2 = Medium (normal features, minor bugs)
- 3 = Low (enhancements, nice-to-haves)
- 4 = Backlog (future work, deferred)

**Status workflow:**

- open → in_progress → (review loops) → closed
- Beads start as "open"
- Claim with `bd update --status=in_progress`
- Close with `bd close <id>` only after both reviews pass

## Testing These Skills

To test the beads workflow:

1. Create a test design doc
2. Use `custom-skills/writing-plans` to create beads
3. Use `custom-skills/subagent-driven-development` to implement
4. Verify beads are closed correctly
5. Check `bd stats` to see completion

## Questions?

See:

- `bd quickstart` - Beads CLI reference
- `.beads/README.md` - Beads system documentation
- Original skills in `/home/stuff/.claude/plugins/cache/superpowers-marketplace/superpowers/4.0.3/skills/`
