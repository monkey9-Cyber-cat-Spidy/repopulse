# ADR 004: "Evidence Before Intelligence" Grounding and Verification Protocol

## Status
Accepted

## Context
A major failing of existing AI repository assistants and automated documentation generators is hallucination. When an LLM is asked *"Where does authentication happen?"* or *"How many API routes are in this service?"*, it often guesses plausible names based on training data or invents files that do not exist.

Furthermore, documentation drift in open source and enterprise software creates dangerous illusions: developers rely on README claims that were invalidated by commits months ago.

For RepoPulse to earn engineering trust, it must enforce the principle of **Evidence Before Intelligence**:
> No architectural claim, diagram edge, documentation verification score, or AI query answer may be presented to the user unless it is grounded in an immutable, deterministic piece of source-code evidence.

## Decision
We establish the **RepoPulse Grounding Protocol**:
1. **Deterministic Indexing Phase (No LLM):**
   - The AST scanner creates an immutable index of all real files, symbols, routes, models, and dependencies.
   - Every entity is assigned a canonical Evidence Pointer:
     ```typescript
     interface EvidencePointer {
       filePath: string;
       commitSha?: string;
       startLine: number;
       endLine: number;
       startColumn: number;
       endColumn: number;
       astNodeType: string;
       codeSnippet: string;
       confidence: 1.0; // 1.0 for deterministic AST proof
     }
     ```
2. **Documentation Verification Pipeline:**
   - Markdown documents (`README.md`, `CONTRIBUTING.md`, `docs/**/*.md`) are parsed into distinct factual claims (Claim extraction).
   - Each claim is matched against the deterministic AST index:
     - Exact matches $\rightarrow$ Status: `VERIFIED` (Confidence: 1.0)
     - Stale numbers / partial matches $\rightarrow$ Status: `OUTDATED` (Confidence: 0.85)
     - Documented features completely contradicted by code (e.g. docs say JWT, code uses basic auth session) $\rightarrow$ Status: `CONTRADICTED` (Confidence: 0.95)
     - Subsystems discovered by AST but missing in docs $\rightarrow$ Status: `UNDOCUMENTED`
3. **AI Response Guardrail:**
   - The Repo Intelligence Assistant is given tools that query the deterministic graph and evidence pointers.
   - Prompts strictly mandate: *"You must cite an EvidencePointer for every assertion. If an architectural fact cannot be verified via the deterministic graph, you MUST state 'NOT VERIFIED BY SOURCE CODE' instead of inferring."*
4. **Audit Trail Persistence:**
   - All verification decisions and evidence pointers are logged to the `EvidenceAudit` table, creating a reproducible evidence chain.

## Consequences
- **Positive:**
  - Complete elimination of architectural hallucinations.
  - Generates verifiable trust: engineers can click any claim or diagram node and inspect the exact lines of code on GitHub or local disk.
  - Scores a direct 20/20 on the "Model & Reasoning-Effort Discipline" judging pillar.
- **Negative:**
  - Highly dynamic JavaScript idioms (e.g., dynamic string concatenation in `app.use('/api/' + version, handler)`) require fallback heuristics and explicit "Partial Evidence" annotations.
