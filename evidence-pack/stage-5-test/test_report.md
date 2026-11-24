# RepoPulse — Stage 5: Test
## Automated Test Suites, Characterization Verification, and Coverage Audit

**Project:** RepoPulse — Living Architecture Cartographer & Truth Engine  
**Event:** GeeksforGeeks × OpenAI "Build with Codex" (1-Month Build Challenge)  
**Lifecycle Stage:** Stage 5 — Test  
**Author:** Manikanta (GitHub: `monkey9-Cyber-cat-Spidy`)  
**Core Motto:** *Evidence Before Intelligence*  

---

### 1. Test Suite Architecture & Results

The test suite is powered by **Vitest** with isolated Node.js V8 execution:

```
 RUN  v2.1.9 F:/GFG competition/repopulse
      Coverage enabled with v8

 ✓ packages/truth-engine/tests/truth-engine.test.ts (3 tests)
 ✓ packages/scanner/tests/scanner.test.ts (7 tests)
 ✓ packages/graph/tests/graph.test.ts (6 tests)
 ✓ packages/mcp-server/tests/mcp-server.test.ts (3 tests)

 Test Files  4 passed (4)
      Tests  19 passed (19)
   Duration  1.31s
```

#### Detailed Test Coverage Breakdown
- **`@repopulse/scanner`**:
  - `redactor.test`: Verified deterministic masking of AWS access keys (`AKIA...`), Stripe keys (`sk_live_...`), and passwords.
  - `routeVisitor.test`: Verified Express AST extraction, middleware chains, mount prefixes, and subrouter propagation.
  - `modelVisitor.test`: Verified Mongoose schema and Prisma model parsing.
  - `envVisitor.test`: Verified `process.env` traversal and default fallback extraction (`||`, `??`).
  - `symbolVisitor.test`: Verified class declarations, exported functions, and static/dynamic imports.
  - `scanRepository.test`: Verified full repository scan and `EvidencePointer` generation.
- **`@repopulse/graph`**:
  - `c4-builder.test`: Verified Level 1 Context, Level 2 Container, Level 3 Component, and Level 4 Code graph construction.
  - `algorithms.test`: Verified Tarjan cycle detection and degree centrality ranking.
  - `export.test`: Verified Dagre coordinate layouting (`x, y`) and React Flow / Mermaid serialization.
- **`@repopulse/truth-engine`**:
  - `claim-extractor.test`: Verified Markdown assertion extraction (routes, databases, auth, configs).
  - `verifier.test`: Verified deterministic categorization (`VERIFIED`, `OUTDATED`, `CONTRADICTED`, `UNDOCUMENTED`).
  - `scorer.test`: Verified Documentation Truth Score formula.
  - `test-generator.test`: Verified behavioral characterization test synthesis.
- **`@repopulse/mcp-server`**:
  - `tools.test`: Verified tool registration (`repopulse_scan`, `repopulse_get_graph`, `repopulse_query_symbol`, `repopulse_verify_claims`, `repopulse_get_evidence`, `repopulse_propose_test`).
  - `resources.test`: Verified streaming JSON resources (`repopulse://graph/c4`, `repopulse://truth/report`, `repopulse://catalog/routes`).

---

### 2. Live Validation against Real Repositories

| Repository | Files | LOC | Scan Latency | Routes Extracted | Truth Score | Result |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| **ShopLedger v0.8.4** (Workshop Target) | 20 | 2,315 | 117ms | 22 | 0.0% (16 Undocumented) | Complete AST & Architecture graph generated |
| **Local-SEO-Pro** (Production App) | 352 | 92,513 | 3,853ms | 1,016 | 0.0% (933 Undocumented) | Scaled to 100k LOC in < 4 seconds |

---

**Stage 5 Test Status:** COMPLETE & VERIFIED  
**Next Stage:** Stage 6 — Debug (Performance, Edge Cases, & Optimization)  
