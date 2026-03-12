# CAOS Platform Constraints

## Cross-file imports in backend functions

**Status: UNVERIFIED at runtime — treat as assumed restriction until proven otherwise.**

Base44 coding instructions state:
> "NO LOCAL IMPORTS — Each file is deployed independently. Cannot import from other files in functions folder, otherwise you might encounter a 'Module not found' error."

This has not been verified with a live runtime test. Until a probe confirms otherwise, helpers shared across function files must be **inlined** at the top of the consuming file, clearly delimited with a comment referencing this document.

**To verify:** Create two test function files, one importing a named export from the other, deploy both, and invoke the importing function. Record the exact runtime error (or success) here and update this status.

**Affected files:**
- `functions/core/repoInference` — inlines `openaiFetchWithTimeout