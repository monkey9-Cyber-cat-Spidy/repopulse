# RepoPulse — Stage 1: Understand
## Problem Statement, Scope, and Solution Definition

**Project:** RepoPulse — Living Architecture Cartographer & Truth Engine  
**Event:** GeeksforGeeks × OpenAI "Build with Codex" (1-Month Build Challenge)  
**Track:** Solo Project — Prize Pool ₹6,00,000  
**Author:** Manikanta (GitHub: `monkey9-Cyber-cat-Spidy`)  
**Core Motto:** *Evidence Before Intelligence* — Your repository has the answers. RepoPulse shows you where they are.

---

### 1. Problem Statement

Modern software engineering teams waste hundreds of hours attempting to comprehend legacy, undocumented, or rapidly evolving codebases. When engineers join a project or evaluate unfamiliar code:
1. **Documentation Drift & Fiction:** READMEs, wikis, and design docs degrade within weeks. They describe what authors intended months ago, not what the codebase actually does today.
2. **Hidden Topography:** Application execution entry points, dynamic route registrations, cascading middleware chains, and implicit database queries are scattered across dozens of source files.
3. **The "Archaeology Tax":** Developers spend up to 60% of their onboarding time performing manual grep/find searches, asking teammates, or tracing call stacks just to answer basic questions: *"Which route handles user checkout?"*, *"Where is authentication enforced?"*, *"What happens when this database model changes?"*.
4. **Fear of Modification:** Without dependable architectural visibility and characterization tests capturing existing runtime behavior, refactoring legacy code frequently causes regressions in undocumented edge cases.
5. **AI Chatbot Hallucinations:** Generic LLMs answering questions about codebases frequently invent endpoints, hallucinate parameter signatures, or propose architectural patterns that do not exist in the actual repository.

---

### 2. The Solution: RepoPulse

RepoPulse is an open-source, evidence-grounded Architecture Cartographer and Documentation Truth Engine. Instead of asking developers to manually maintain documentation or relying on speculative AI reasoning, RepoPulse executes **deterministic AST static analysis**, builds a **hierarchical C4 architecture knowledge graph**, and rigorously verifies all documentation claims against source-code truth.

Every architectural claim, graph relationship, and AI-assisted insight in RepoPulse must cite **exact file paths, start-to-end line numbers, and verifiable AST node evidence**. If proof cannot be established, RepoPulse returns `"UNKNOWN / UNVERIFIED"` rather than guessing.

---

### 3. Core Capabilities & Killer Features

#### A. Living Architecture Cartographer (C4 Interactive Explorer)
- Ingests repositories (local directory or GitHub repository clone).
- Deterministically extracts:
  - Application entry points (`server.js`, `index.ts`, `app.js`).
  - HTTP Routes & Middleware chains (Express, Fastify, Next.js).
  - Database Models, Schemas, & Relations (Prisma, Mongoose, Sequelize, TypeORM).
  - Environment Variable dependencies (`process.env.*`).
  - Inter-module import/export dependency networks.
- Renders interactive, zoomable C4 diagrams (System Context $\rightarrow$ Container $\rightarrow$ Component $\rightarrow$ Code) powered by Graphology and React Flow.

#### B. Documentation Truth Engine (Drift Detector)
- Parses repository documentation (`README.md`, `docs/**/*.md`, inline JSDocs).
- Extracts testable architectural claims (e.g., claimed endpoints, database technology, authentication methods, active microservices).
- Cross-references claims against discovered AST symbols.
- Produces a **Documentation Truth Score (0–100%)** categorized into:
  - `VERIFIED`: Source code corroborates the claim with line references.
  - `OUTDATED`: Claim was once true but implementation has diverged (e.g., doc states 12 endpoints; 19 exist).
  - `CONTRADICTED`: Claim contradicts code reality (e.g., doc claims MongoDB; code uses PostgreSQL).
  - `UNDOCUMENTED`: Critical subsystems (e.g., WebSocket servers, payment webhooks) present in code but absent from documentation.

#### C. Evidence-Grounded Repo Intelligence Assistant
- Natural language query interface powered by the Model Context Protocol (MCP).
- Answers complex architectural questions (e.g., *"Trace the full lifecycle of an order from HTTP request to database persist"*).
- Strict verification rule: Every assertion must link to verifiable source lines. Zero unsubstantiated answers.

#### D. Behavioral Characterization Test Generator
- Inspects target functions, services, and route endpoints.
- Analyzes parameter expectations, conditional branch paths, and error handling.
- Synthesizes automated characterization tests (Jest/Vitest) capturing existing behavior to protect against refactoring regressions before any code is altered.

---

### 4. Target Demonstration Repositories

To prove the robustness of RepoPulse in real-world environments, it will be validated against:
1. **`ShopLedger v0.8.4` (Legacy Baseline):** The workshop's legacy POS/inventory management application with hidden Khata ledgers, out-of-sync invoice calculations, and undocumented coupon logic.
2. **`Local-SEO-Pro` (Complex Production Target):** Real-world Node.js/Express full-stack application featuring multi-tenant database interactions, REST APIs, OAuth middleware, external API integrations, and extensive frontend assets.

---

### 5. Alignment with Contest Evaluation Criteria (100 Points)

| Judging Criteria | Points | RepoPulse Strategy |
|:---|:---:|:---|
| **1. Lifecycle Coverage & Depth** | 30 | Complete evidence recorded across all 8 lifecycle stages (*Understand $\rightarrow$ Plan $\rightarrow$ Setup $\rightarrow$ Build $\rightarrow$ Test $\rightarrow$ Debug $\rightarrow$ Ship $\rightarrow$ Automate*). |
| **2. Codex Capability Use & Fit** | 25 | Deep native integration with Model Context Protocol (MCP), subagents for parallel analysis, terminal execution, AST tools, and structured `AGENTS.md`. |
| **3. Model & Reasoning-Effort Discipline** | 20 | Tiered model execution: Fast, deterministic AST algorithms for indexing and parsing; high-reasoning models (`o3-mini`/high) for deep architectural causality, data flow synthesis, and test generation. |
| **4. Working Result & Engineering Craft** | 15 | Monorepo architecture, TypeScript type safety, React Flow interactive visual explorer, $>85\%$ test coverage, containerized live deployment. |
| **5. Problem Worth Solving & Originality** | 10 | Directly attacks the universal "onboarding and legacy code archaeology" bottleneck with evidence-backed documentation verification. |

---

**Stage 1 Status:** COMPLETE & FROZEN  
**Next Stage:** Stage 2 — Comprehensive Architecture & Technical Plan  
