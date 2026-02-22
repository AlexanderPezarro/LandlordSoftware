# Implementer Subagent Prompt Template

Use this template when dispatching an implementer subagent.

```
Task tool (general-purpose):
  description: "Implement Task #{TASK_ID}: {task title}"
  prompt: |
    You are implementing Task #{TASK_ID}: {task title}

    ## Task Specification

    {FULL TASK DESCRIPTION from TaskGet - paste it here}

    ## Context

    {Scene-setting: where this fits, dependencies, architectural context}

    This task is part of: {overall feature/project description}
    Dependencies completed: {list any tasks this depends on}
    Working directory: {directory}

    ## Before You Begin

    If you have questions about:
    - The requirements or acceptance criteria
    - The approach or implementation strategy
    - Dependencies or assumptions
    - Anything unclear in the task specification

    **Ask them now.** Raise any concerns before starting work.

    ## Your Job

    Once you're clear on requirements:
    1. Implement exactly what the task specifies
    2. Write tests (following TDD as specified in the task)
    3. Verify implementation works
    4. Commit your work
    5. Self-review (see below)
    6. Report back

    **While you work:** If you encounter something unexpected or unclear, **ask questions**.
    It's always OK to pause and clarify. Don't guess or make assumptions.

    ## Before Reporting Back: Self-Review

    Review your work with fresh eyes. Ask yourself:

    **Completeness:**
    - Did I fully implement everything in the task specification?
    - Did I miss any requirements?
    - Are there edge cases I didn't handle?

    **Quality:**
    - Is this my best work?
    - Are names clear and accurate (match what things do, not how they work)?
    - Is the code clean and maintainable?

    **Discipline:**
    - Did I avoid overbuilding (YAGNI)?
    - Did I only build what was requested in the task?
    - Did I follow existing patterns in the codebase?

    **Testing:**
    - Do tests actually verify behavior (not just mock behavior)?
    - Did I follow TDD as specified?
    - Are tests comprehensive?

    If you find issues during self-review, fix them now before reporting.

    ## Report Format

    When done, report:
    - Task ID: #{TASK_ID}
    - What you implemented
    - What you tested and test results
    - Files changed
    - Commits made
    - Self-review findings (if any)
    - Any issues or concerns
```

## Example Dispatch

````
Task tool (general-purpose):
  description: "Implement Task #1: Setup database schema"
  prompt: |
    You are implementing Task #1: Setup database schema

    ## Task Specification

    ## Overview
    Create the initial database schema for the landlord management system.
    This establishes the foundation tables that all other features will use.

    ## Files
    - Create: `src/db/schema.sql`
    - Create: `src/db/migrations/001_initial_schema.sql`
    - Create: `tests/db/test_schema.py`

    ## Implementation Steps

    ### Step 1: Write schema validation test

    ```python
    # tests/db/test_schema.py
    def test_schema_has_required_tables():
        tables = get_tables_from_schema('src/db/schema.sql')
        assert 'landlords' in tables
        assert 'properties' in tables
        assert 'tenants' in tables
    ```

    Run: `pytest tests/db/test_schema.py -v`
    Expected: FAIL (files don't exist yet)

    ### Step 2: Create database schema

    ```sql
    CREATE TABLE landlords (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
    );
    ```

    ### Step 3: Verify tests pass

    Run: `pytest tests/db/test_schema.py -v`
    Expected: PASS

    ### Step 4: Commit

    ```bash
    git add tests/db/test_schema.py src/db/schema.sql src/db/migrations/
    git commit -m "feat: add initial database schema"
    ```

    ## Verification

    - Schema file parses without errors
    - All tables have primary keys
    - Tests pass

    ## Context

    This is the foundation task for the entire landlord management system.
    Dependencies completed: None (this is a foundation task)
    Working directory: /home/ubuntu/projects/LandlordSoftware
````
