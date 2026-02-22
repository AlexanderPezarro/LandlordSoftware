---
name: writing-uat-plan
description: Use after writing user stories to create a detailed User Acceptance Testing plan. Reads user stories and produces step-by-step UAT scenarios that can be executed manually or by verify-app.
---

# Writing UAT Plan

## Overview

Convert user stories into a detailed User Acceptance Testing plan. Each user story's acceptance criteria becomes one or more UAT scenarios with step-by-step instructions, expected results, and preconditions.

**Announce at start:** "I'm using the writing-uat-plan skill to create the UAT plan from the user stories."

## The Process

### Step 1: Read the User Stories

- Find the user stories doc in `docs/plans/` (or ask the user which one)
- Read it thoroughly
- List all stories and their acceptance criteria

### Step 2: Write UAT Scenarios

For each user story, create UAT scenarios that cover every acceptance criterion.

**Scenario format:**

```markdown
### UAT-<number>: <scenario title>

**User Story:** US-<number> - <story title>
**Acceptance Criteria Tested:** <which criteria this covers>

**Preconditions:**
- <what must be true before testing>
- <test data needed>
- <user role to login as>

**Steps:**
1. Navigate to <URL/page>
2. <action> (e.g., "Click the 'Add Property' button")
3. Enter "<value>" in the "<field>" field
4. Click "<button>"
5. ...

**Expected Results:**
- <what should happen after each key step>
- <what the page should show>
- <data that should be created/modified>

**Edge Cases:**
- <edge case 1>: <what to test and expected result>
- <edge case 2>: <what to test and expected result>
```

**Guidelines:**

- Every acceptance criterion must be covered by at least one scenario
- Steps must be concrete: specific URLs, button labels, field names, test data
- Expected results must be observable (what the user sees, not internal state)
- Include the test user role and credentials reference
- Group related scenarios under their user story

### Step 3: Add Setup and Teardown

At the top of the plan, include:

- **Test environment setup**: how to start the app, seed data, etc.
- **Test credentials**: which test users to use
- **Reset procedure**: how to reset state between test runs

### Step 4: Present for Review

- Present a summary of scenarios per story
- Ask: "Any scenarios missing or any acceptance criteria not covered?"
- Iterate until the user is satisfied

### Step 5: Write the Document

- Write to `docs/plans/YYYY-MM-DD-<topic>-uat-plan.md`
- Include structured metadata at the top for machine-readability
- Commit the document to git

## Document Structure

```markdown
# UAT Plan: <Topic>

**User stories:** docs/plans/YYYY-MM-DD-<topic>-user-stories.md
**Date:** YYYY-MM-DD

## Test Environment

- **Start app:** `npm run dev`
- **Seed data:** `npm run db:seed`
- **Base URL:** http://localhost:5173

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | admin123 |
| Landlord | landlord@example.com | landlord123 |

## Scenarios

### Epic: <Epic Name>

#### UAT-001: <scenario title>
**User Story:** US-001 - <title>
**Acceptance Criteria Tested:** AC-1, AC-2
...

#### UAT-002: <scenario title>
...

## Summary

| UAT ID | Story | Scenario | Status |
|--------|-------|----------|--------|
| UAT-001 | US-001 | ... | pending |

## Results

<!-- Filled in during execution -->
| UAT ID | Status | Notes |
|--------|--------|-------|
```

## Key Principles

- **Concrete steps** - No ambiguity; anyone should be able to follow them
- **Observable results** - Expected results are what the user sees, not internal logic
- **Complete coverage** - Every acceptance criterion has at least one scenario
- **Executable by verify-app** - Scenarios should be specific enough for browser automation
- **Independent scenarios** - Each scenario can run independently (setup included)

## Integration

**Requires before this skill:**

- **writing-user-stories** - Produces the user stories this skill reads

**Used by:**

- **verify-app** - Executes UAT scenarios when in UAT mode
- **finishing-a-development-branch** - Triggers UAT execution and handles pass/fail loop
