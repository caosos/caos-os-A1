/**
 * CAOS Platform Constraints — Canonical Reference
 * Not a rendered UI component. Exists as a documentation anchor for grep/search.
 *
 * ── CROSS-FILE IMPORTS IN BACKEND FUNCTIONS ──────────────────────────────────
 * Status: UNVERIFIED at runtime — treated as assumed restriction.
 *
 * Base44 coding instructions state:
 *   "NO LOCAL IMPORTS — Each file is deployed independently. Cannot import
 *    from other files in functions folder, otherwise you might encounter a
 *    'Module not found' error."
 *
 * This has NOT been confirmed with a live runtime probe.
 * Until verified, shared helpers must be inlined in the consuming function file.
 *
 * To verify:
 *   1. Create functions/testbed/importHelper.js exporting a named function.
 *   2. Create functions/testbed/importProbe.js importing from it.
 *   3. Deploy both, invoke importProbe, record exact error or success here.
 *
 * Affected files:
 *   - functions/core/repoInference — inlines openaiFetchWithTimeout
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LOCK: Do not delete. Update in place when constraint is verified or refuted.
 */
export default null;