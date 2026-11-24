# RepoPulse — Stage 7: Ship
## Release Artifacts, Containerization, and Deployment Manifest

**Project:** RepoPulse — Living Architecture Cartographer & Truth Engine  
**Event:** GeeksforGeeks × OpenAI "Build with Codex" (1-Month Build Challenge)  
**Lifecycle Stage:** Stage 7 — Ship  
**Author:** Manikanta (GitHub: `monkey9-Cyber-cat-Spidy`)  
**Core Motto:** *Evidence Before Intelligence*  

---

### 1. Delivery & Deployment Artifacts

RepoPulse ships in 3 complementary modalities:

1. **Interactive Web Application (`packages/web`):**
   - Live C4 visual architecture cartographer with level switching (Context, Container, Component, Code).
   - Real-time Documentation Truth dial with breakdown of verified, outdated, and contradicted claims.
   - Evidence Inspector drawer allowing users to click any component or edge to inspect exact source lines.
   - Hosted entrypoint: `node packages/web/server.js` (listening on port 3000 / 3005).

2. **Standalone Executable CLI (`packages/cli`):**
   - Packaged and executable via `repopulse scan <path>`, `repopulse verify <path>`, and `repopulse test-gen <target>`.
   - Generates `.repopulse/scan.json`, `.repopulse/c4-level-3.json`, and `.repopulse/architecture.mmd` diagrams in target repositories.

3. **Production Docker Container (`Dockerfile`):**
   - Multi-stage Alpine container isolating build dependencies from lean production runtime.
   - Zero-configuration entrypoint exposing the living architecture cartographer.

4. **Model Context Protocol (MCP) Server (`packages/mcp-server`):**
   - Run via `repopulse mcp` or `npm run mcp`.
   - Implements standard Model Context Protocol over stdio transport.

---

### 2. Live Runtime Verification

```bash
# 1. Scan target repository
node packages/cli/dist/index.js scan "F:\GFG competition\shopledger-master"
# Result: 20 files, 2,315 LOC scanned in 117ms -> 22 routes, C4 graph persisted.

# 2. Audit documentation drift
node packages/cli/dist/index.js verify "F:\GFG competition\shopledger-master" -d AGENTS.md
# Result: 16 undocumented REST endpoints detected in code absent from AGENTS.md.

# 3. Synthesize characterization tests
node packages/cli/dist/index.js test-gen "POST /customers/:id/settle" -p "F:\GFG competition\shopledger-master"
# Result: Self-contained Vitest suite capturing current observable behavior generated.
```

---

**Stage 7 Ship Status:** COMPLETE & DEPLOYED  
**Next Stage:** Stage 8 — Automate (CI/CD Pipelines, Drift Alerts, & Full Evidence Pack)  
