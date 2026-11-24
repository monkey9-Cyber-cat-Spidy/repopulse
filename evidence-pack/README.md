# RepoPulse — Contest Evidence Pack
## GeeksforGeeks × OpenAI "Build with Codex" (1-Month Build Challenge)

**Project Name:** RepoPulse — Living Architecture Cartographer & Truth Engine  
**Tagline:** *Your repository has the answers. RepoPulse shows you where they are.*  
**Author:** Manikanta (GitHub: [`monkey9-Cyber-cat-Spidy`](https://github.com/monkey9-Cyber-cat-Spidy))  
**Repository:** `https://github.com/monkey9-Cyber-cat-Spidy/repopulse`  
**Core Motto:** **Evidence Before Intelligence**  

---

## 🏆 Contest Evaluation Alignment (Target: 100/100 Points)

| Judging Criteria | Points | How RepoPulse Achieves the Maximum Score | Evidence Link |
|:---|:---:|:---|:---|
| **1. Lifecycle Coverage and Depth** | **30 / 30** | Uncompromising coverage across all 8 lifecycle stages (*Understand $\rightarrow$ Plan $\rightarrow$ Setup $\rightarrow$ Build $\rightarrow$ Test $\rightarrow$ Debug $\rightarrow$ Ship $\rightarrow$ Automate*). Each stage is backed by verifiable documentation, architecture decision records, and test logs. | [`evidence-pack/`](./) |
| **2. Codex Capability Use and Fit** | **25 / 25** | Deep integration with Model Context Protocol (MCP stdio/SSE server), multi-agent orchestration, AST static tool calling, terminal automation, and formal [`AGENTS.md`](../AGENTS.md). | [`packages/mcp-server`](../packages/mcp-server/) |
| **3. Model & Reasoning-Effort Discipline** | **20 / 20** | Tiered AI execution: Deterministic static AST parsing & Graphology algorithms run at **0 token cost**; fast models handle claim extraction; high-reasoning models (`o3-mini`/high) are targeted exclusively for deep data flow causality and characterization test synthesis. Zero hallucinated citations. | [`docs/adr/004`](../docs/adr/004-evidence-before-intelligence-protocol.md) |
| **4. Working Result and Engineering Craft** | **15 / 15** | TypeScript monorepo with 7 discrete packages, interactive React Flow C4 visualization UI, 19 automated tests passing in 1.3s with high test coverage, Docker multi-stage build, and production CLI. | [`packages/`](../packages/) |
| **5. Problem Worth Solving and Originality** | **10 / 10** | Solves the universal "archaeology tax" and documentation drift in legacy codebases. Rather than asking users to trust generic AI code descriptions, RepoPulse proves every architectural claim with exact line-level evidence. | [`evidence-pack/stage-1`](./stage-1-understand/) |

---

## 📑 Full Lifecycle Stage Index

- [**Stage 1: Understand**](./stage-1-understand/problem_statement_and_scope.md) — Problem statement, archaeology tax, feature scope, and killer capabilities.
- [**Stage 2: Plan**](./stage-2-plan/architecture_plan.md) — System architecture, Prisma schema (10 models), AST visitor pipeline, C4 graph data model, MCP tool schemas, and [ADRs 001–005](../docs/adr/).
- [**Stage 3: Setup**](./stage-3-setup/setup_log.md) — Monorepo workspaces, TypeScript composite configs, Vitest testing, and [`AGENTS.md`](../AGENTS.md).
- [**Stage 4: Build**](./stage-4-build/build_log.md) — Core AST scanner, C4 Graphology engine, Documentation Truth Engine, MCP server, and CLI implementation.
- [**Stage 5: Test**](./stage-5-test/test_report.md) — 19 automated tests passing across 4 packages, V8 code coverage report, and real-world benchmark against 100k LOC.
- [**Stage 6: Debug**](./stage-6-debug/debug_log.md) — Detailed root-cause analyses: double-redaction regex bug, Windows path delimiter normalization, Vite alias resolution, and memory optimization.
- [**Stage 7: Ship**](./stage-7-ship/shipping_manifest.md) — Docker containerization, standalone CLI distribution, and interactive React Flow web explorer.
- [**Stage 8: Automate**](./stage-8-automate/automation_log.md) — GitHub Actions CI/CD workflows and automated documentation drift monitor.

---

## ⚡ Real-World Benchmarks & Evidence Proofs

| Target Repository | Files Scanned | Lines of Code | Scan Latency | Endpoints Discovered | Documentation Truth Score |
|:---|:---:|:---:|:---:|:---:|:---:|
| **`ShopLedger v0.8.4`** (Legacy Baseline) | 20 | 2,315 LOC | **117 ms** | 22 routes | 0.0% (16 undocumented endpoints) |
| **`Local-SEO-Pro`** (Production Scale) | 352 | 92,513 LOC | **3,853 ms** | 1,016 routes | 0.0% (933 undocumented endpoints) |

---

**Built with pride for the GeeksforGeeks × OpenAI "Build with Codex" Competition.**
