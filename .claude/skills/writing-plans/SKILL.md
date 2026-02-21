---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

## Overview

Create comprehensive beads for an implementation tree assuming the engineer has zero context for our codebase and questionable taste. Each bead contains everything they need to know: which files to touch, code examples, testing steps, documentation to check, and how to verify it works. Give them the whole plan as bite-sized beads. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation tree as beads."

**Context:** This should be run in a dedicated worktree (created by brainstorming skill).

## Bite-Sized Bead Granularity

**Each bead is a cohesive feature (15-30 minutes):**

- Group related test-write-test-commit cycles into one bead
- Each bead should be independently verifiable
- Each bead should be a complete, shippable unit

**Bead structure contains:**

- Clear title describing what will be implemented
- Complete task description with all steps
- Files to create/modify with exact paths
- Code examples for implementation
- Test steps with expected output
- Commit instructions

## Bead Structure

Each bead description should contain:

````markdown
## Overview

[What this bead implements and why]

## Files

- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

## Implementation Steps

### Step 1: Write the failing test

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```
````

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

### Step 2: Write minimal implementation

```python
def function(input):
    return expected
```

### Step 3: Verify tests pass

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

### Step 4: Commit

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```

## Verification

[How to verify this bead is complete - manual tests, integration checks, etc.]

## Notes

[Any important context, gotchas, or design decisions]

````

## Creating the Beads

**Step 1: Plan the bead tree**
- Read the design document
- Identify all features/components needed
- Determine dependencies between features
- Plan order of implementation

**Step 2: Create beads in parallel**
- Use superpowers:dispatching-parallel-agents to create multiple beads efficiently
- Each subagent creates one bead with full specification
- Use priority levels: 0=critical, 1=high, 2=medium, 3=low, 4=backlog
- Use `bd create` with detailed description containing full task specification

**Step 3: Set up dependencies**
- Use `bd dep add <issue> <depends-on>` to chain beads
- Ensure foundation beads are done before dependent beads
- Use `bd dep tree` to visualize the dependency graph

**Example bead creation:**
```bash
# Create foundation bead (priority 1=high)
bd create --title="Setup database schema" \
  --type=feature \
  --priority=1 \
  --description="$(cat <<'EOF'
## Overview
Create the initial database schema for the landlord management system.

## Files
- Create: `src/db/schema.sql`
- Create: `src/db/migrations/001_initial_schema.sql`

## Implementation Steps

### Step 1: Write schema test
[Full test code here]

### Step 2: Create schema
[Full SQL here]

### Step 3: Verify
[Verification steps]

### Step 4: Commit
git add src/db/schema.sql src/db/migrations/001_initial_schema.sql
git commit -m "feat: add initial database schema"
EOF
)"

# Create dependent bead
bd create --title="Implement landlord CRUD operations" \
  --type=feature \
  --priority=1 \
  --description="[Full task specification]"

# Add dependency (CRUD depends on schema)
bd dep add beads-abc123 beads-def456
````

## Remember

- Exact file paths always
- Complete code in bead description (not "add validation")
- Exact commands with expected output
- Reference relevant skills with @ syntax
- DRY, YAGNI, TDD, frequent commits
- Use parallel subagents to create many beads efficiently
- Each bead description must be complete and standalone

## Execution Handoff

**Beads created. Ready for implementation.**

Use **superpowers:subagent-driven-development** to execute:

- Finds ready beads with `bd ready`
- Dispatches implementer per bead
- Reviews (spec compliance, then code quality)
- Closes bead with `bd close`
- Repeats until all beads are done

## Integration

**Required before this skill:**

- **superpowers:brainstorming** - Creates design doc this skill uses
- **superpowers:using-git-worktrees** - Creates isolated workspace

**Used after this skill:**

- **superpowers:subagent-driven-development** - Executes the beads
- **superpowers:dispatching-parallel-agents** - Creates beads in parallel efficiently
