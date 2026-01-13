# Implementer Subagent Prompt Template

Use this template when dispatching an implementer subagent.

```
Task tool (general-purpose):
  description: "Implement {BEAD_ID}: {bead title}"
  prompt: |
    You are implementing {BEAD_ID}: {bead title}

    ## Bead Specification

    {FULL BEAD DESCRIPTION from bd show <id> - paste it here}

    ## Context

    {Scene-setting: where this fits, dependencies, architectural context}

    This bead is part of: {overall feature/project description}
    Dependencies completed: {list any beads this depends on}
    Working directory: {directory}

    ## Before You Begin

    If you have questions about:
    - The requirements or acceptance criteria
    - The approach or implementation strategy
    - Dependencies or assumptions
    - Anything unclear in the bead specification

    **Ask them now.** Raise any concerns before starting work.

    ## Your Job

    Once you're clear on requirements:
    1. Implement exactly what the bead specifies
    2. Write tests (following TDD as specified in the bead)
    3. Verify implementation works
    4. Commit your work
    5. Self-review (see below)
    6. Report back

    **While you work:** If you encounter something unexpected or unclear, **ask questions**.
    It's always OK to pause and clarify. Don't guess or make assumptions.

    ## Before Reporting Back: Self-Review

    Review your work with fresh eyes. Ask yourself:

    **Completeness:**
    - Did I fully implement everything in the bead specification?
    - Did I miss any requirements?
    - Are there edge cases I didn't handle?

    **Quality:**
    - Is this my best work?
    - Are names clear and accurate (match what things do, not how they work)?
    - Is the code clean and maintainable?

    **Discipline:**
    - Did I avoid overbuilding (YAGNI)?
    - Did I only build what was requested in the bead?
    - Did I follow existing patterns in the codebase?

    **Testing:**
    - Do tests actually verify behavior (not just mock behavior)?
    - Did I follow TDD as specified?
    - Are tests comprehensive?

    If you find issues during self-review, fix them now before reporting.

    ## Report Format

    When done, report:
    - Bead ID: {BEAD_ID}
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
  description: "Implement beads-a3f2dd: Setup database schema"
  prompt: |
    You are implementing beads-a3f2dd: Setup database schema

    ## Bead Specification

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
    -- src/db/schema.sql
    CREATE TABLE landlords (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE properties (
        id INTEGER PRIMARY KEY,
        landlord_id INTEGER NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        zip_code TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (landlord_id) REFERENCES landlords(id)
    );

    CREATE INDEX idx_properties_landlord ON properties(landlord_id);

    CREATE TABLE tenants (
        id INTEGER PRIMARY KEY,
        property_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        lease_start DATE NOT NULL,
        lease_end DATE NOT NULL,
        rent_amount DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties(id)
    );

    CREATE INDEX idx_tenants_property ON tenants(property_id);
    ```

    ### Step 3: Create migration file

    Copy schema.sql to migrations/001_initial_schema.sql

    ### Step 4: Verify tests pass

    Run: `pytest tests/db/test_schema.py -v`
    Expected: PASS

    ### Step 5: Commit

    ```bash
    git add src/db/schema.sql src/db/migrations/001_initial_schema.sql tests/db/test_schema.py
    git commit -m "feat: add initial database schema for landlord management

    - Create landlords, properties, and tenants tables
    - Add foreign key relationships
    - Add indexes for common queries

    Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
    ```

    ## Verification

    - Schema file parses without errors
    - All tables have primary keys
    - Foreign keys are properly defined
    - Indexes exist on foreign key columns
    - Tests pass

    ## Notes

    - Use INTEGER for IDs (SQLite compatibility)
    - Use TIMESTAMP for dates (ISO 8601 format)
    - Don't add audit columns beyond created_at (YAGNI)
    - Indexes on foreign keys improve join performance

    ## Context

    This is the foundation bead for the entire landlord management system.
    It establishes the core data model that all other beads will build upon.

    Dependencies completed: None (this is a foundation bead)
    Working directory: /mnt/c/Users/stuff/Documents/Projects/LandlordSoftware
````
