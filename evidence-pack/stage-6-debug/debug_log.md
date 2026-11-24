# RepoPulse — Stage 6: Debug
## Edge Cases, Parser Error Recovery, Memory Profiling, and Bug Fixes

**Project:** RepoPulse — Living Architecture Cartographer & Truth Engine  
**Event:** GeeksforGeeks × OpenAI "Build with Codex" (1-Month Build Challenge)  
**Lifecycle Stage:** Stage 6 — Debug  
**Author:** Manikanta (GitHub: `monkey9-Cyber-cat-Spidy`)  
**Core Motto:** *Evidence Before Intelligence*  

---

### 1. Debugged Issues & Root-Cause Analyses

#### Bug 1: Double-Redaction Cascading in Secret Scrubbing Engine
- **Symptom:** During unit tests, a raw string containing an AWS access key and Stripe secret key triggered 3 redactions instead of 2 (`expected 3 to be 2`).
- **Root Cause:** The `ASSIGNED_SECRET` regex ran after `STRIPE_SECRET_KEY` and saw `secret = "[REDACTED_SECRET: STRIPE_SECRET_KEY]"`. Because `"[REDACTED..."` matched the assignment pattern, the sanitizer replaced the placeholder itself, nesting placeholders: `[REDACTED_SECRET: ASSIGNED_SECRET]`.
- **Fix:** Applied a negative lookahead `(?!\[REDACTED_SECRET)` to `ASSIGNED_SECRET` in `packages/scanner/src/redactor.ts`:
  ```typescript
  // Before
  regex: /(?<=\b(?:password|secret|api_key)\s*[:=]\s*['"])(?:(?!\1)[^\r\n]{4,})(?=['"])/gi

  // After (Fixed)
  regex: /(?<=\b(?:password|secret|api_key)\s*[:=]\s*['"])(?!\[REDACTED_SECRET)[^'"\r\n]{4,}(?=['"])/gi
  ```
- **Verification:** Test passed in 73ms with exact 2 redactions.

#### Bug 2: Cross-Platform Windows Path Delimiter Duplication
- **Symptom:** On Windows systems, `path.relative` produced backslashes (`\`), causing graph node lookups (`routes/orders.js` vs `routes\orders.js`) to fail to connect dependency edges.
- **Root Cause:** Unsanitized OS-specific separators used as Graphology node identifiers.
- **Fix:** Added `.replace(/\\/g, '/')` across all file enumerations in `packages/scanner/src/parser.ts` and `packages/scanner/src/resolver.ts`.
- **Verification:** All 1,016 routes and module dependencies in `Local-SEO-Pro` resolved cleanly to uniform POSIX-compatible node identifiers.

#### Bug 3: Vite CJS / ESM Workspace Dependency Resolution
- **Symptom:** Vitest runner initially failed with `Error: Failed to resolve entry for package "@repopulse/scanner"`.
- **Root Cause:** Package workspace symlinks expected `./dist/index.js`, which did not yet exist before compilation.
- **Fix:** Configured explicit `resolve.alias` mappings in `vitest.config.ts` mapping `@repopulse/*` directly to package TypeScript source files during test runs.

#### Bug 4: Memory Optimization on 100k+ LOC Repositories
- **Symptom:** Scanning 352 files with deep AST traversals risked high heap spikes.
- **Resolution:** Reused AST visitor traversal contexts, purged raw AST representations after visitor runs, and retained only lightweight `FileScanSummary` objects in memory.
- **Result:** Complete scan of `Local-SEO-Pro` (92,513 LOC) completed in 3.85 seconds with minimal memory footprint.

---

**Stage 6 Debug Status:** COMPLETE & OPTIMIZED  
**Next Stage:** Stage 7 — Ship (Docker Container, Standalone CLI, & Live Web App)  
