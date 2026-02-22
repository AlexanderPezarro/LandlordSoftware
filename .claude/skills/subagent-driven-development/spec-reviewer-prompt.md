# Spec Compliance Reviewer Prompt Template

Use this template when dispatching a spec compliance reviewer subagent.

**Purpose:** Verify implementer built what was requested in the task (nothing more, nothing less)

```
Task tool (general-purpose):
  description: "Review spec compliance for Task #{TASK_ID}"
  prompt: |
    You are reviewing whether an implementation matches its task specification.

    ## Task ID

    #{TASK_ID}: {task title}

    ## Task Specification (What Was Requested)

    {FULL TASK DESCRIPTION from TaskGet}

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
    - Compare actual implementation to task specification line by line
    - Check for missing pieces they claimed to implement
    - Look for extra features they didn't mention

    ## Your Job

    Read the implementation code and verify against the task specification:

    **Missing requirements:**
    - Did they implement everything specified in the task?
    - Are there requirements they skipped or missed?
    - Did they claim something works but didn't actually implement it?
    - Did they skip any steps from the task's implementation steps?

    **Extra/unneeded work:**
    - Did they build things not requested in the task?
    - Did they over-engineer or add unnecessary features?
    - Did they add "nice to haves" not in the task spec?

    **Misunderstandings:**
    - Did they interpret task requirements differently than intended?
    - Did they solve the wrong problem?
    - Did they implement the right feature but wrong way?

    **Commits:**
    - Did they commit as specified in the task?
    - Is the commit message appropriate?

    **Verify by reading code, not by trusting report.**

    ## Report Format

    Provide your assessment:

    **Task ID:** #{TASK_ID}

    **Status:** ✅ Spec compliant OR ❌ Issues found

    **If issues found, list specifically:**
    - Missing: [what's missing with file:line references]
    - Extra: [what was added that wasn't requested with file:line references]
    - Misunderstood: [what was implemented differently than specified]

    **Example:**
    ❌ Issues found:
    - Missing: Task specified index on landlord_id (schema.sql), not present in implementation
    - Extra: Added "updated_at" column to landlords table (not requested in task)
    - Misunderstood: Task said use TIMESTAMP, but implementer used DATETIME
```

## Example Dispatch

```
Task tool (general-purpose):
  description: "Review spec compliance for Task #1"
  prompt: |
    You are reviewing whether an implementation matches its task specification.

    ## Task ID

    #1: Setup database schema

    ## Task Specification (What Was Requested)

    ## Overview
    Create the initial database schema for the landlord management system.

    ## Files
    - Create: `src/db/schema.sql`
    - Create: `src/db/migrations/001_initial_schema.sql`
    - Create: `tests/db/test_schema.py`

    [Full task specification...]

    ## What Implementer Claims They Built

    Implementer report:
    - Created src/db/schema.sql with landlords, properties, tenants tables
    - Created migration file 001_initial_schema.sql
    - Added tests in tests/db/test_schema.py
    - All 3 tests passing
    - Committed with message "feat: add initial database schema"
    - Self-review: Found I missed index on landlord_id, added it

    ## CRITICAL: Do Not Trust the Report
    [... rest of template ...]
```
