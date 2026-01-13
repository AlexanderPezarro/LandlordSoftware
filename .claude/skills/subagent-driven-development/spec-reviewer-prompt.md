# Spec Compliance Reviewer Prompt Template

Use this template when dispatching a spec compliance reviewer subagent.

**Purpose:** Verify implementer built what was requested in the bead (nothing more, nothing less)

```
Task tool (general-purpose):
  description: "Review spec compliance for {BEAD_ID}"
  prompt: |
    You are reviewing whether an implementation matches its bead specification.

    ## Bead ID

    {BEAD_ID}: {bead title}

    ## Bead Specification (What Was Requested)

    {FULL BEAD DESCRIPTION from bd show <id>}

    ## What Implementer Claims They Built

    {From implementer's report}

    ## CRITICAL: Do Not Trust the Report

    The implementer finished suspiciously quickly. Their report may be incomplete,
    inaccurate, or optimistic. You MUST verify everything independently.

    **DO NOT:**
    - Take their word for what they implemented
    - Trust their claims about completeness
    - Accept their interpretation of requirements

    **DO:**
    - Read the actual code they wrote
    - Compare actual implementation to bead specification line by line
    - Check for missing pieces they claimed to implement
    - Look for extra features they didn't mention

    ## Your Job

    Read the implementation code and verify against the bead specification:

    **Missing requirements:**
    - Did they implement everything specified in the bead?
    - Are there requirements they skipped or missed?
    - Did they claim something works but didn't actually implement it?
    - Did they skip any steps from the bead's implementation steps?

    **Extra/unneeded work:**
    - Did they build things not requested in the bead?
    - Did they over-engineer or add unnecessary features?
    - Did they add "nice to haves" not in the bead spec?

    **Misunderstandings:**
    - Did they interpret bead requirements differently than intended?
    - Did they solve the wrong problem?
    - Did they implement the right feature but wrong way?

    **Commits:**
    - Did they commit as specified in the bead?
    - Is the commit message appropriate?

    **Verify by reading code, not by trusting report.**

    ## Report Format

    Provide your assessment:

    **Bead ID:** {BEAD_ID}

    **Status:** ✅ Spec compliant OR ❌ Issues found

    **If issues found, list specifically:**
    - Missing: [what's missing with file:line references]
    - Extra: [what was added that wasn't requested with file:line references]
    - Misunderstood: [what was implemented differently than specified]

    **Example:**
    ❌ Issues found:
    - Missing: Bead specified index on landlord_id (schema.sql), not present in implementation
    - Extra: Added "updated_at" column to landlords table (not requested in bead)
    - Misunderstood: Bead said use TIMESTAMP, but implementer used DATETIME
```

## Example Dispatch

```
Task tool (general-purpose):
  description: "Review spec compliance for beads-a3f2dd"
  prompt: |
    You are reviewing whether an implementation matches its bead specification.

    ## Bead ID

    beads-a3f2dd: Setup database schema

    ## Bead Specification (What Was Requested)

    ## Overview
    Create the initial database schema for the landlord management system.

    ## Files
    - Create: `src/db/schema.sql`
    - Create: `src/db/migrations/001_initial_schema.sql`
    - Create: `tests/db/test_schema.py`

    ## Implementation Steps

    ### Step 1: Write schema validation test
    [Full test code from bead]

    ### Step 2: Create database schema
    [Full SQL from bead - including the landlord_id index requirement]

    ### Step 3: Create migration file
    Copy schema.sql to migrations/001_initial_schema.sql

    ### Step 4: Verify tests pass
    Run: `pytest tests/db/test_schema.py -v`
    Expected: PASS

    ### Step 5: Commit
    [Commit instructions from bead]

    ## What Implementer Claims They Built

    Implementer report:
    - Created src/db/schema.sql with landlords, properties, tenants tables
    - Created migration file 001_initial_schema.sql
    - Added tests in tests/db/test_schema.py
    - All 3 tests passing
    - Committed with message "feat: add initial database schema"
    - Self-review: Found I missed index on landlord_id, added it

    ## CRITICAL: Do Not Trust the Report

    The implementer finished suspiciously quickly. Their report may be incomplete,
    inaccurate, or optimistic. You MUST verify everything independently.

    **DO NOT:**
    - Take their word for what they implemented
    - Trust their claims about completeness
    - Accept their interpretation of requirements

    **DO:**
    - Read the actual code they wrote
    - Compare actual implementation to bead specification line by line
    - Check for missing pieces they claimed to implement
    - Look for extra features they didn't mention

    ## Your Job

    Read the implementation code and verify against the bead specification:

    **Missing requirements:**
    - Did they implement everything specified in the bead?
    - Are there requirements they skipped or missed?
    - Did they claim something works but didn't actually implement it?
    - Did they skip any steps from the bead's implementation steps?

    **Extra/unneeded work:**
    - Did they build things not requested in the bead?
    - Did they over-engineer or add unnecessary features?
    - Did they add "nice to haves" not in the bead spec?

    **Misunderstandings:**
    - Did they interpret bead requirements differently than intended?
    - Did they solve the wrong problem?
    - Did they implement the right feature but wrong way?

    **Commits:**
    - Did they commit as specified in the bead?
    - Is the commit message appropriate?

    **Verify by reading code, not by trusting report.**
```
