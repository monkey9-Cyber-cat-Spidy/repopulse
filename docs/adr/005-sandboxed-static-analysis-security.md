# ADR 005: Sandboxed Static Parsing, Zero Execution, and Credential Redaction

## Status
Accepted

## Context
RepoPulse is designed to inspect arbitrary, untrusted third-party and legacy codebases. Running tools that execute untrusted code (e.g., executing `node app.js`, requiring files, or running untrusted post-install scripts) exposes the host machine or cloud infrastructure to Remote Code Execution (RCE), malicious environment variable harvesting, or denial-of-service loops.

Additionally, codebases frequently contain inadvertently committed secrets (API keys, AWS credentials, JWT signing secrets, `.env` files). If RepoPulse ingests and exposes these secrets in graphs, evidence snippets, or AI prompts, it creates severe security and compliance liabilities.

## Decision
We enforce three strict security boundaries:
1. **Zero Execution of Analyzed Code:**
   - Scanning is 100% pure static analysis. Under no circumstances is the analyzed repository code executed, `eval`'d, or imported via `require()` / `import()` into the RepoPulse process.
   - All parsing occurs through AST tokenization via `@babel/parser` and static syntax tree visitors.
2. **Deterministic Credential & Secret Scrubbing:**
   - An automated Secret Redaction Filter runs on all file contents before storing evidence snippets or passing code tokens to AI models.
   - Detects and replaces patterns with `[REDACTED_SECRET: <TYPE>]`:
     - High-entropy tokens, AWS access keys (`AKIA[0-9A-Z]{16}`), GitHub PATs (`ghp_[a-zA-Z0-9]{36}`), Stripe secret keys (`sk_live_[0-9a-zA-Z]{24}`), private keys (`-----BEGIN RSA PRIVATE KEY-----`), and JWT secrets in configuration files.
     - `.env` files and `.env.local` are flagged for configuration presence, but raw variable values are never indexed or displayed.
3. **Strict Path Traversal Boundary:**
   - All filesystem operations are anchored to `path.resolve(repoRoot)`. Any relative path traversal attempts (`../`, symbolic links pointing outside the repository tree, or absolute paths outside the repo root) are rejected with a security audit violation.
4. **Isolated Test Execution (Characterization Tests):**
   - When running generated characterization tests, execution is isolated within ephemeral Node.js `worker_threads` with restricted environment variables, disabled network sockets, and mocked filesystem/DB adapters.

## Consequences
- **Positive:**
  - Secure by design: Safe to run against unknown, malicious, or sensitive repositories.
  - Zero risk of leaking secrets in reports, visual graphs, or AI prompts.
  - Passes enterprise SOC 2 and DevSecOps compliance requirements.
- **Negative:**
  - Dynamic runtime values (such as runtime-computed port numbers or database connection strings) cannot be executed; they must be resolved via static AST inference or marked as dynamic expressions.
