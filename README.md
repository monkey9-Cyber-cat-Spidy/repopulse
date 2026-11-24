# RepoPulse 🚀
### Living Architecture Cartographer & Truth Engine

> **Tagline:** *Your repository has the answers. RepoPulse shows you where they are.*  
> **Core Principle:** **Evidence Before Intelligence**

RepoPulse is an open-source, evidence-grounded Architecture Cartographer and Documentation Truth Engine for modern software engineering teams. It performs deterministic AST static analysis on codebases, builds a 4-tier C4 architecture knowledge graph, detects documentation drift, and synthesizes behavioral characterization tests.

---

## 🏆 Contest Alignment (GeeksforGeeks × OpenAI "Build with Codex")

RepoPulse is built for the **1-Month Build Challenge** across all 8 lifecycle stages:

1. **Understand:** Problem statement, scope, and killer features defined in [`evidence-pack/stage-1-understand`](./evidence-pack/stage-1-understand/).
2. **Plan:** Database schema, AST visitors, C4 graph model, MCP tools, and 5 ADRs in [`docs/STAGE_2_PLAN.md`](./docs/STAGE_2_PLAN.md) and [`docs/adr/`](./docs/adr/).
3. **Setup:** TypeScript monorepo, workspaces, Prisma ORM, Vitest, and [`AGENTS.md`](./AGENTS.md).
4. **Build:** High-performance AST scanner, Graphology C4 engine, Documentation Truth Engine, MCP Server, and React Flow visualizer.
5. **Test:** Automated unit, integration, and characterization tests with >85% coverage.
6. **Debug:** Performance profiling, cyclic dependency resolution, and parser error recovery.
7. **Ship:** Docker deployment, standalone CLI (`npx repopulse`), and live web application.
8. **Automate:** GitHub Actions CI/CD and automated documentation drift pull request generation.

---

## 🌟 The Killer Features

### 1. Living Architecture Cartographer (C4 Interactive Explorer)
- Zero-execution AST analysis extracting Express/Fastify routes, Mongoose/Prisma/Sequelize models, middleware chains, and environment variables.
- Interactive C4 zoomable hierarchy (System Context $\rightarrow$ Container $\rightarrow$ Component $\rightarrow$ Code) powered by Graphology and React Flow.
- Every node and edge is linked to exact source code lines.

### 2. Documentation Truth Engine (Drift Detector)
- Audits repository documentation (`README.md`, `docs/**/*.md`) against deterministic AST code facts.
- Computes a **Documentation Truth Score (0–100%)** categorized into `VERIFIED`, `OUTDATED`, `CONTRADICTED`, and `UNDOCUMENTED`.
- Zero hallucination: Every verdict cites verifiable line ranges.

### 3. Model Context Protocol (MCP) Server
- Exposes tools (`repopulse_scan`, `repopulse_get_graph`, `repopulse_query_symbol`, `repopulse_trace_dataflow`, `repopulse_verify_claims`, `repopulse_get_evidence`, `repopulse_propose_test`) for AI agents.
- Delivers grounded context directly into Codex and Antigravity agents.

### 4. Behavioral Characterization Test Generator
- Analyzes legacy functions and route handlers.
- Automatically generates Vitest/Jest characterization tests capturing existing observable behavior to protect against regressions before refactoring.

---

## 🛠️ Monorepo Architecture

```
repopulse/
├── packages/
│   ├── scanner/              # AST parsing, symbol indexing, visitor engines, secret redaction
│   ├── graph/                # Graphology C4 engine, graph algorithms, layout calculators
│   ├── truth-engine/         # Markdown claim extractor, truth scoring, contradiction detector
│   ├── mcp-server/           # Standardized Model Context Protocol server (stdio & SSE)
│   ├── db/                   # Prisma schema, SQLite/PG client, migrations, repositories
│   ├── cli/                  # Command-line interface (`repopulse scan`, `repopulse verify`)
│   └── web/                  # Next.js / React 19 interactive architecture visualizer
├── docs/
│   ├── adr/                  # Architecture Decision Records (001 - 005)
│   └── STAGE_2_PLAN.md       # Comprehensive Architecture & Technical Plan
├── evidence-pack/            # Contest Evidence Pack across all 8 stages
├── package.json              # Monorepo root workspace configuration
└── AGENTS.md                 # Agent guidelines, boundaries, and commands
```

---

## 📜 Architecture Decision Records (ADRs)

- [ADR 001: Hybrid AST Parsing & Deterministic Symbol Resolution](docs/adr/001-hybrid-ast-and-symbol-resolution.md)
- [ADR 002: Dual-Mode Persistence Strategy (SQLite & PostgreSQL via Prisma)](docs/adr/002-dual-mode-persistence-sqlite-postgres.md)
- [ADR 003: C4 Hierarchical Graph Data Model using Graphology and React Flow](docs/adr/003-c4-graphology-data-model.md)
- [ADR 004: "Evidence Before Intelligence" Grounding & Verification Protocol](docs/adr/004-evidence-before-intelligence-protocol.md)
- [ADR 005: Sandboxed Static Parsing, Zero Execution, and Credential Redaction](docs/adr/005-sandboxed-static-analysis-security.md)

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/monkey9-Cyber-cat-Spidy/repopulse.git
cd repopulse

# Install dependencies
npm run setup

# Run the test suite
npm test

# Scan any repository
npm run scan -- /path/to/target/repo

# Launch the interactive explorer
npm run dev
```

---

## 📄 License
MIT License. Built for the GeeksforGeeks × OpenAI "Build with Codex" Competition.
