# RepoPulse — Stage 3: Setup
## Monorepo Configuration, Package Scaffolding, and Toolchain Integration

**Project:** RepoPulse — Living Architecture Cartographer & Truth Engine  
**Event:** GeeksforGeeks × OpenAI "Build with Codex" (1-Month Build Challenge)  
**Lifecycle Stage:** Stage 3 — Setup  
**Author:** Manikanta (GitHub: `monkey9-Cyber-cat-Spidy`)  
**Core Motto:** *Evidence Before Intelligence*  

---

### 1. Workspace Configuration & Monorepo Architecture

RepoPulse has been initialized as an npm workspace monorepo supporting 7 discrete packages:

| Package Name | Local Directory | Target Role & Scope |
|:---|:---|:---|
| `@repopulse/scanner` | `packages/scanner` | Deterministic AST parsing (`@babel/parser`), symbol resolution, framework visitors, secret scrubber. |
| `@repopulse/graph` | `packages/graph` | C4 hierarchical multigraph engine (`graphology`), PageRank, cycle detection, Dagre layouting. |
| `@repopulse/truth-engine` | `packages/truth-engine` | Markdown claim extraction, truth verification against AST facts, 0-100% truth scoring, test synthesis. |
| `@repopulse/mcp-server` | `packages/mcp-server` | Standardized Model Context Protocol (MCP) server providing live tools & resources to AI agents. |
| `@repopulse/db` | `packages/db` | Dual-mode Prisma ORM schema (SQLite default for CLI; PostgreSQL for cloud team hosting). |
| `@repopulse/cli` | `packages/cli` | Executable CLI tool (`repopulse scan`, `repopulse verify`) built with Commander.js. |
| `@repopulse/web` | `packages/web` | Interactive React Flow C4 visualizer, truth scorecard, and split-screen code evidence viewer. |

---

### 2. Toolchain & Quality Infrastructure

- **Node.js Environment:** v26.13.0 (modern native ES modules and worker thread support).
- **TypeScript Configuration:** Root `tsconfig.json` enforcing `strict: true`, `NodeNext` module resolution, composite project references, and declaration maps.
- **Testing Engine:** Vitest configured in `vitest.config.ts` with V8 code coverage provider (mandating >85% target coverage across packages).
- **Security Boundaries:** Enforced via `AGENTS.md` and `docs/adr/005-sandboxed-static-analysis-security.md`:
  - 100% static analysis (zero execution of target repository files).
  - Regex-based secret and credential scrubber (`redactor.ts`).
  - Path traversal boundary lock.

---

### 3. Verification Checkpoints

- [x] Git repository initialized with branch `main` and clean commit history.
- [x] Root `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, and `README.md` configured.
- [x] All 7 package manifests (`package.json`) and package-specific TypeScript configurations created.
- [x] Prisma canonical schema with 10 relational entities configured in `packages/db/prisma/schema.prisma`.
- [x] `AGENTS.md` operating manual established with non-negotiable architectural boundaries.

**Stage 3 Setup Status:** COMPLETE  
**Next Stage:** Stage 4 — Build (Core Scanner, Graph Engine, Truth Engine & MCP Server)  
