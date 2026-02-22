---
name: verify-app
description: "Run the app locally, login, navigate key pages, and produce a visual verification report using Rodney (browser automation) and Showboat (demo documents). Use after completing features or before PRs to confirm the app works end-to-end. Supports UAT mode when a UAT plan exists."
---

# Verify App

## Overview

Launch the application, log in as a test user, and produce a Markdown verification report with screenshots. Uses **Rodney** for headless browser automation and **Showboat** for building the report document.

**Two modes:**

- **UAT mode** (preferred): When a UAT plan exists (`docs/plans/*-uat-plan.md`), execute each UAT scenario and report pass/fail per scenario.
- **Default mode** (fallback): When no UAT plan exists, navigate key pages and verify they load correctly.

**Announce at start:** "I'm using the verify-app skill to visually verify the application works."

## Mode Selection

Check for a UAT plan:

```bash
ls docs/plans/*-uat-plan.md 2>/dev/null
```

- If found → use **UAT mode** (go to "UAT Mode Process" below)
- If not found → use **Default mode** (go to "Default Mode Process" below)

---

## UAT Mode Process

### UAT Step 1: Ensure the App is Running

Same as Default Step 1 (see below).

### UAT Step 2: Initialize Report

```bash
showboat init docs/verification-report.md "UAT Verification Report"
showboat note docs/verification-report.md "Executing UAT scenarios from the UAT plan."
```

### UAT Step 3: Launch Browser and Login

Same as Default Steps 4-5 (see below). Use the test credentials specified in the UAT plan.

### UAT Step 4: Execute UAT Scenarios

Read the UAT plan document. For each scenario:

```bash
showboat note docs/verification-report.md "## UAT-<number>: <scenario title>"
showboat note docs/verification-report.md "**User Story:** US-<number>"
```

Follow each step in the scenario using Rodney:

```bash
# Navigate as specified
rodney --local open http://localhost:5173/<path>
rodney --local waitstable

# Perform actions (click, input, etc.)
rodney --local click '<selector>'
rodney --local input '<selector>' '<value>'
rodney --local waitstable

# Screenshot after key steps
rodney --local screenshot /tmp/uat-<number>-step-<n>.png
showboat image docs/verification-report.md /tmp/uat-<number>-step-<n>.png

# Verify expected results
rodney --local assert '<js-expression>'
```

After each scenario, record the result:

```bash
# If all steps passed:
showboat note docs/verification-report.md "**Result: PASS**"

# If any step failed:
showboat note docs/verification-report.md "**Result: FAIL** — Step <N>: <what went wrong>"
```

### UAT Step 5: Write Results Summary

```bash
showboat note docs/verification-report.md "## Results Summary"
showboat note docs/verification-report.md "| UAT ID | Scenario | Result | Notes |"
showboat note docs/verification-report.md "|--------|----------|--------|-------|"
# One row per scenario:
showboat note docs/verification-report.md "| UAT-001 | <title> | PASS | |"
showboat note docs/verification-report.md "| UAT-003 | <title> | FAIL | Step 4: expected X, got Y |"
```

### UAT Step 6: Cleanup

Same as Default Step 8 (see below).

### UAT Step 7: Report Back

Report structured results to the caller:

```
UAT Results:
- Total: N scenarios
- Passed: N
- Failed: N
- Failures:
  - UAT-003: <scenario> — Step 4: expected <X>, got <Y>
  - UAT-007: <scenario> — Step 2: element not found

Report: docs/verification-report.md
```

This structured output allows `finishing-a-development-branch` to decide whether to proceed or enter the fix loop.

---

## Default Mode Process

### Step 1: Ensure the App is Running

Check if the dev servers are already running. If not, start them.

```bash
# Ensure Prisma client is up to date with the schema
# This is critical after merges or migrations — new models won't be
# available at runtime until the client is regenerated.
npx prisma generate

# Check API health
curl -sf http://localhost:3000/api/health || {
  echo "Server not running, starting..."
  npm run dev &
  sleep 8
}

# Verify both servers respond
curl -sf http://localhost:3000/api/health
curl -sf -o /dev/null http://localhost:5173
```

If the database has no data, seed it:

```bash
npm run db:seed
```

Read the showboat help to understand how to use it

```bash
showboat --help
```

### Step 2: Initialize Showboat Report

```bash
showboat init docs/verification-report.md "App Verification Report"
showboat note docs/verification-report.md "Automated visual verification of the running application."
```

### Step 3: Verify API Health

```bash
showboat exec docs/verification-report.md bash 'curl -s http://localhost:3000/api/health | python3 -m json.tool'
```

If the health check fails, `showboat pop` the failed entry and stop — report the error.

### Step 4: Launch Browser

```bash
rodney start --local
```

Use `--local` so the Rodney session state is stored in `./.rodney/` (project-scoped, gitignored).

### Step 5: Login

```bash
showboat note docs/verification-report.md "## Login"
showboat note docs/verification-report.md "Navigating to the login page and signing in as the admin test user."

rodney --local open http://localhost:5173/login
rodney --local waitstable
rodney --local screenshot /tmp/verify-login.png
showboat image docs/verification-report.md '![Login page](/tmp/verify-login.png)'

rodney --local input '#email' 'admin@example.com'
rodney --local input '#password' 'admin123'
rodney --local click 'button[type="submit"]'
rodney --local waitstable
```

Verify login succeeded:

```bash
rodney --local url  # Should be http://localhost:5173/dashboard
```

If the URL is not `/dashboard`, the login failed — screenshot the error state, add it to the report, and stop.

### Step 6: Navigate Key Pages

For each page, follow this pattern:

```bash
showboat note docs/verification-report.md "## <Page Name>"

rodney --local open http://localhost:5173/<path>
rodney --local waitstable
rodney --local screenshot /tmp/verify-<page>.png
showboat image docs/verification-report.md '![<Page Name>](/tmp/verify-<page>.png)'
```

**Pages to verify (in order):**

| Page         | URL Path       | What to Check                              |
| ------------ | -------------- | ------------------------------------------ |
| Dashboard    | `/dashboard`   | Stats cards render, events & transactions  |
| Properties   | `/properties`  | Property list loads with seeded data       |
| Tenants      | `/tenants`     | Tenant list loads                          |
| Leases       | `/leases`      | Lease list loads                           |
| Transactions | `/transactions`| Transaction list loads                     |
| Events       | `/events`      | Events calendar/list renders               |

**Optional deeper checks** — use Rodney's assertion capabilities:

```bash
# Check that the properties page has at least one property card
rodney --local assert 'document.querySelectorAll("table tbody tr, [class*=Card], [class*=card]").length > 0'

# Check dashboard stats are present
rodney --local exists '[class*=stat], [class*=Stat], [class*=summary]'
```

Don't let assertion failures block the report — screenshot the state and note the failure.

### Step 7: Finalize Report

```bash
showboat note docs/verification-report.md "## Summary"
showboat note docs/verification-report.md "All pages verified successfully. The application is functioning correctly."
```

If any pages failed:

```bash
showboat note docs/verification-report.md "## Summary"
showboat note docs/verification-report.md "Verification completed with issues: <describe failures>"
```

### Step 8: Cleanup

```bash
rodney --local stop
rm -f /tmp/verify-*.png
```

Do NOT stop the dev servers — the user may still need them.

## Test Credentials

| Role     | Email                  | Password     |
| -------- | ---------------------- | ------------ |
| Admin    | admin@example.com      | admin123     |
| Landlord | landlord@example.com   | landlord123  |
| Viewer   | viewer@example.com     | viewer123    |

Default login uses admin. If testing role-based access, use the appropriate credentials.

## Rodney Quick Reference

```bash
rodney start [--show] [--local]     # Launch Chrome (--show for visible window)
rodney open <url>                    # Navigate
rodney input '<selector>' '<text>'   # Type into field
rodney click '<selector>'            # Click element
rodney screenshot [file]             # Capture PNG
rodney wait '<selector>'             # Wait for element
rodney waitstable                    # Wait for DOM stability
rodney text '<selector>'             # Extract text content
rodney exists '<selector>'           # Check element exists (exit 1 if not)
rodney assert '<js-expr>' ['<val>']  # Assert JS expression
rodney url                           # Get current URL
rodney title                         # Get page title
rodney stop                          # Shut down Chrome
```

All commands accept `--local` to use project-scoped session (`./.rodney/`).

## Showboat Quick Reference

```bash
showboat init <file> '<title>'                    # Create document
showboat note <file> '<text>'                     # Add commentary
showboat exec <file> <lang> '<code>'              # Run code, capture output
showboat image <file> '<path>'                    # Embed image
showboat image <file> '![alt text](<path>)'       # Embed image with alt
showboat pop <file>                               # Remove last entry
showboat verify <file>                            # Re-run and check outputs
```

## Working with MUI Components

This app uses Material-UI (MUI). Key notes for Rodney automation:

**Input IDs are dynamic:** MUI generates IDs like `:r1n:`, `:r21:`. Don't hardcode them. Instead, map labels to IDs at runtime:

```bash
rodney --local js '(function(){ return [...document.querySelectorAll("[role=dialog] label")].map(function(l){ return l.textContent + " → " + l.getAttribute("for"); }).join("\\n"); })()'
```

**CSS selectors can't contain colons:** Use `rodney --local js 'document.getElementById(":r1n:")'` instead of `rodney --local click '#:r1n:'`.

**MUI Select dropdowns:** Open with mousedown event, then click the option:

```bash
# Open dropdown
rodney --local js 'document.getElementById(":r21:").dispatchEvent(new MouseEvent("mousedown", {bubbles: true}))'
rodney --local waitstable

# Click option
rodney --local js '(function(){ var target = [...document.querySelectorAll("[role=option]")].find(function(o){ return o.textContent === "Semi-Detached"; }); target.click(); return "Selected"; })()'
```

**Clicking buttons by text:** CSS `:has-text()` is not valid. Use JS:

```bash
rodney --local js '[...document.querySelectorAll("button")].find(function(b){ return b.textContent.includes("Add Property"); }).click()'
```

**Setting input values via React:** Use the native value setter to trigger React's onChange:

```bash
rodney --local js '(function(){ var el = document.getElementById(":r2b:"); var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set; setter.call(el, "285000"); el.dispatchEvent(new Event("input", { bubbles: true })); return "done"; })()'
```

**Showboat image alt text:** The `!` in `![alt](path)` can be interpreted by bash. Either use `showboat image file.md /path/to/image.png` (without alt text) or pipe via stdin.

## Troubleshooting

**Rodney fails to start:** Ensure Chrome/Chromium dependencies are installed. Rodney downloads its own Chromium on first run. If behind a proxy, it may fail — download manually.

**Login fails:** Verify the database is seeded (`npm run db:seed`). Check that the API is responding (`curl http://localhost:3000/api/health`).

**Vite not responding:** Run `cd client && npm install` then restart with `npm run dev`.

**Showboat image paths:** Showboat copies images into the same directory as the report. Use absolute paths for the source image.

## Output

The report is written to `docs/verification-report.md` with screenshots alongside it. This file is gitignored by default — commit it if you want a permanent record.

## Common Mistakes

**Forgetting `--local` on Rodney commands:** Without it, Rodney uses `~/.rodney/` which may conflict with other sessions. Always use `--local`.

**Not waiting for DOM stability:** MUI components render asynchronously. Always `rodney waitstable` before screenshots or assertions.

**Leaving Rodney running:** Always `rodney --local stop` in cleanup. Orphaned Chrome processes consume memory.

**Rodney `js` only accepts expressions:** Use IIFEs: `(function(){ ... })()`. `var`/`const`/`let` at top level will fail.

## Integration

**Called by:**

- **finishing-a-development-branch** - Dispatches this skill as a subagent to run UAT before presenting merge/PR options

**Reads:**

- **writing-uat-plan** output (`docs/plans/*-uat-plan.md`) - UAT scenarios to execute in UAT mode

**Produces:**

- `docs/verification-report.md` - Visual report with screenshots and pass/fail results
