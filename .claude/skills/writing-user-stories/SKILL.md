---
name: writing-user-stories
description: Use after brainstorming to convert a design document into user stories with acceptance criteria. Reads the design doc and collaboratively produces user stories.
---

# Writing User Stories

## Overview

Convert a validated design document into well-structured user stories. Each story is written collaboratively with the user, presented in sections for validation before moving on.

**Announce at start:** "I'm using the writing-user-stories skill to create user stories from the design document."

## The Process

### Step 1: Read the Design Document

- Find the most recent design doc in `docs/plans/` (or ask the user which one)
- Read it thoroughly
- Identify the key features, roles, and workflows described

### Step 2: Identify Roles and Epics

- Extract the user roles from the design (e.g., landlord, tenant, admin)
- Group features into epics (logical clusters of related functionality)
- Present the proposed roles and epics to the user for validation before writing stories

### Step 3: Write Stories Incrementally

For each epic, write user stories and present them one epic at a time for validation.

**Story format:**

```markdown
### US-<number>: <short title>

**As a** <role>, **I want** <capability>, **so that** <benefit>.

**Acceptance Criteria:**
- [ ] <criterion 1>
- [ ] <criterion 2>
- [ ] <criterion 3>

**Priority:** High / Medium / Low
**Complexity:** Small / Medium / Large
**Epic:** <epic name>
```

**Guidelines:**

- One capability per story (keep them atomic)
- Acceptance criteria should be testable and specific
- 3-6 acceptance criteria per story
- Include happy path and key error cases
- Priority reflects business value
- Complexity reflects implementation effort

### Step 4: Review and Adjust

- After all epics are covered, present a summary table:

```markdown
| ID | Story | Priority | Complexity | Epic |
|----|-------|----------|------------|------|
```

- Ask: "Any stories to add, remove, or modify?"
- Iterate until the user is satisfied

### Step 5: Write the Document

- Write to `docs/plans/YYYY-MM-DD-<topic>-user-stories.md`
- Include a header with the design doc reference, date, and summary
- Commit the document to git

## Document Structure

```markdown
# User Stories: <Topic>

**Design document:** docs/plans/YYYY-MM-DD-<topic>-design.md
**Date:** YYYY-MM-DD

## Roles

- **<Role 1>**: <brief description>
- **<Role 2>**: <brief description>

## Epic: <Epic Name>

### US-001: <title>
...

### US-002: <title>
...

## Epic: <Epic Name>

### US-003: <title>
...

## Summary

| ID | Story | Priority | Complexity | Epic |
|----|-------|----------|------------|------|
| US-001 | ... | High | Medium | ... |
```

## Key Principles

- **One question at a time** - Present one epic's stories, then validate
- **Testable criteria** - Every acceptance criterion must be verifiable
- **YAGNI** - Only stories that serve the design; no gold-plating
- **User-centric language** - Stories describe user value, not implementation
- **Atomic stories** - Each story is independently deliverable

## Integration

**Requires before this skill:**

- **brainstorming** - Produces the design document this skill reads

**Next in workflow:**

- **writing-plans** - Converts user stories into implementation tasks
- **writing-uat-plan** - Converts user stories into detailed UAT instructions
