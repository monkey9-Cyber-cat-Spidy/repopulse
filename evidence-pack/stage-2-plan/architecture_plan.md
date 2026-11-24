# RepoPulse — Stage 2: Plan
## Comprehensive Architecture, Data Models, and Technical Specifications

**Project:** RepoPulse — Living Architecture Cartographer & Truth Engine  
**Event:** GeeksforGeeks × OpenAI "Build with Codex" (1-Month Build Challenge)  
**Lifecycle Stage:** Stage 2 — Plan  
**Deliverable:** System Architecture, Prisma Schema, AST Traversal Pipelines, C4 Graph Data Model, MCP Tool Schemas, Security Guardrails, and Architecture Decision Records (ADRs).  
**Core Motto:** *Evidence Before Intelligence*  

---

### 1. Architectural Foundation & Package Topology

RepoPulse is structured as an enterprise-grade TypeScript monorepo with strict package boundaries:

- **`packages/scanner`**: Static AST analysis engine built on `@babel/parser` and `@babel/traverse`. Performs zero-execution extraction of files, symbols, Express/Fastify routes, Mongoose/Prisma/Sequelize models, and environment variable accesses.
- **`packages/graph`**: In-memory C4 hierarchical multigraph engine built on Graphology. Computes structural metrics (PageRank, topological sort, cycle detection) and renders pre-computed Dagre layout coordinates for React Flow.
- **`packages/truth-engine`**: Natural language documentation auditor. Parses Markdown documentation into factual claims and programmatically cross-references them with discovered AST symbols to generate a 0-100% Documentation Truth Score with exact line citations.
- **`packages/mcp-server`**: Model Context Protocol (JSON-RPC) server exposing tools (`repopulse_scan`, `repopulse_get_graph`, `repopulse_query_symbol`, `repopulse_trace_dataflow`, `repopulse_verify_claims`, `repopulse_get_evidence`, `repopulse_propose_test`) and live streaming resources (`repopulse://graph/c4`, `repopulse://truth/report`).
- **`packages/db`**: Dual-engine persistence layer using Prisma ORM. Defaults to zero-config local SQLite (`.repopulse/data.db`) for developer CLI runs, with seamless migration to PostgreSQL for cloud/enterprise deployments.
- **`packages/web`**: Interactive Next.js / React 19 web application featuring dynamic C4 zoom levels, interactive dependency tracing, and split-screen source code evidence drawers.
- **`packages/cli`**: Node.js executable CLI (`repopulse scan .`, `repopulse verify`) with interactive terminal output.

---

### 2. Architecture Decision Records (ADRs) Summary

The core architectural choices have been formalized into 5 formal ADRs located in `docs/adr/`:

1. **[ADR 001: Hybrid AST Parsing & Deterministic Symbol Resolution](file:///f:/GFG%20competition/repopulse/docs/adr/001-hybrid-ast-and-symbol-resolution.md)**: Selected Babel parser with TypeScript/JSX plugins and error recovery over fragile regex and heavy native C++ Tree-sitter binaries to ensure seamless cross-platform execution on Windows, Linux, and macOS without compilation dependencies.
2. **[ADR 002: Dual-Mode Persistence Strategy (SQLite & PostgreSQL via Prisma)](file:///f:/GFG%20competition/repopulse/docs/adr/002-dual-mode-persistence-sqlite-postgres.md)**: Employs Prisma ORM to support zero-setup local developer runs (SQLite) while maintaining full compatibility with enterprise hosted environments (PostgreSQL).
3. **[ADR 003: C4 Hierarchical Graph Data Model using Graphology and React Flow](file:///f:/GFG%20competition/repopulse/docs/adr/003-c4-graphology-data-model.md)**: Solves the visual "hairball" problem in complex repositories by organizing graphs into 4 C4 levels (Context, Container, Component, Code) with semantic zooming in React Flow.
4. **[ADR 004: Evidence Before Intelligence Grounding Protocol](file:///f:/GFG%20competition/repopulse/docs/adr/004-evidence-before-intelligence-protocol.md)**: Enforces an immutable requirement that all architectural findings, diagram edges, and AI answers must link to verifiable source files, line ranges, and AST tokens.
5. **[ADR 005: Sandboxed Static Parsing, Zero Execution, and Credential Redaction](file:///f:/GFG%20competition/repopulse/docs/adr/005-sandboxed-static-analysis-security.md)**: Guarantees security by prohibiting untrusted code execution during scanning and executing automated regex scrubbing on all secrets and tokens before storage or AI display.

---

### 3. Model & Reasoning-Effort Discipline (Contest Scoring Alignment)

| Execution Tier | Technology / Model | Reasoning Level | Token Cost | Responsibility |
|:---|:---|:---:|:---:|:---|
| **Tier 1: Deterministic Engine** | AST Babel Parser, Graphology, Prisma | Pure Logic | 0 Tokens | Parsing syntax, indexing symbols, mapping routes, detecting ORM models, layouting graphs. |
| **Tier 2: Fast Reasoning** | Small / Fast Model (e.g. gpt-4o-mini / flash) | Low Effort | Ultra-low | Markdown claim extraction, semantic chunking, and fuzzy entity matching. |
| **Tier 3: Deep Reasoning** | High-Reasoning Model (e.g. o3-mini / High) | High Effort | Controlled | Complex inter-service data-flow tracing, architectural trade-off analysis, and behavioral characterization test synthesis. |

---

### 4. Verification Checkpoint & Approval Status

- [x] Database Schema specified in Prisma format with 10 relational entities.
- [x] AST Parsing & Visitor pipelines detailed for Express, Mongoose, Prisma, and environment variables.
- [x] C4 hierarchical graph model and React Flow integration specified.
- [x] Standardized Model Context Protocol (MCP) tool catalog and resource schemas defined.
- [x] Security sandboxing and secret redaction architecture established.
- [x] 5 Architecture Decision Records (ADRs) committed.

**Stage 2 Plan Status:** COMPLETE & FROZEN  
**Next Stage:** Stage 3 — Monorepo Setup & Workspace Scaffolding  
