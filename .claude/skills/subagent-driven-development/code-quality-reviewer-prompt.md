# Code Quality Reviewer Prompt Template

Use this template when dispatching a code quality reviewer subagent.

**Purpose:** Verify implementation is well-built (clean, tested, maintainable)

**Only dispatch after spec compliance review passes.**

```
Task tool (code-reviewer):
  Use template at requesting-code-review/code-reviewer.md

  WHAT_WAS_IMPLEMENTED: {from implementer's report}
  PLAN_OR_REQUIREMENTS: Bead {BEAD_ID} specification:
    {paste the full bead description here}
  BASE_SHA: {commit before this bead}
  HEAD_SHA: {current commit}
  DESCRIPTION: {bead title}
```

**Code reviewer returns:** Strengths, Issues (Critical/Important/Minor), Assessment

## Example Dispatch

```
Task tool (code-reviewer):
  description: "Review code quality for beads-a3f2dd"

  WHAT_WAS_IMPLEMENTED:
    Database schema implementation with landlords, properties, and tenants tables.
    Includes migration file and comprehensive tests.

  PLAN_OR_REQUIREMENTS:
    Bead beads-a3f2dd specification:

    ## Overview
    Create the initial database schema for the landlord management system.

    ## Files
    - Create: `src/db/schema.sql`
    - Create: `src/db/migrations/001_initial_schema.sql`
    - Create: `tests/db/test_schema.py`

    [... full bead specification ...]

  BASE_SHA: 9da03e1
  HEAD_SHA: a7f3bc2
  DESCRIPTION: Setup database schema
```

## Notes

- The code quality review happens AFTER spec compliance passes
- Focus on HOW the code is written, not WHAT was implemented (spec reviewer already checked that)
- Code reviewer checks: naming, test quality, maintainability, patterns, best practices
- Don't repeat spec compliance issues (those should be caught by spec reviewer)
