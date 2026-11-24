# ADR 001: Hybrid AST Parsing and Deterministic Symbol Resolution

## Status
Accepted

## Context
RepoPulse requires deep, language-level understanding of JavaScript and TypeScript codebases. It must extract AST nodes, function/class declarations, imports/exports, dynamic requires, Express/Fastify route definitions, middleware chains, ORM models (Prisma, Mongoose, Sequelize), and environment variable usages.

We evaluated three potential architectural approaches:
1. **RegEx / Grep Pattern Matching:** Fast and lightweight, but fragile to multiline expressions, aliased imports, higher-order functions, and complex code structures. High false-positive and false-negative rates.
2. **Pure Tree-sitter (WASM / Native Bindings):** Extremely fast and universal across languages, but native binary compilation creates cross-platform installation friction on Windows/Linux/macOS, and type-system / semantic symbol resolution requires extensive custom grammar traversal.
3. **Babel Parser (`@babel/parser`) + Babel Traverse (`@babel/traverse`) + TypeScript Compiler API (`ts-morph` / `typescript`):** Native JavaScript runtime execution, zero binary compile issues, native support for modern ECMAScript proposals (decorators, JSX, top-level await, dynamic imports), and deep AST node typing.

## Decision
We adopt a **Hybrid AST Analysis Pipeline**:
- **Babel AST Engine (`@babel/parser` & `@babel/traverse`)** for fast, fault-tolerant syntax tree generation across modern JS/TS, JSX, and TSX files. The parser is configured with all standard syntactic plugins (`typescript`, `jsx`, `decorators-legacy`, `classProperties`, `asyncDoExpressions`, etc.) in `errorRecovery: true` mode to ensure partial AST extraction even when syntax errors exist in legacy files.
- **Node.js Module Resolver with Path Aliasing:** A dedicated module resolution engine that resolves relative imports, directory index files (`index.js`, `index.ts`), extensionless imports, and path aliases configured in `tsconfig.json` or `jsconfig.json`.
- **Domain-Specific AST Visitors:** Modular AST visitor plug-ins specifically targeting:
  - `RouteVisitor`: Detects `express()`, `Router()`, HTTP verb methods (`.get`, `.post`, `.put`, `.delete`, `.use`), mount paths, and middleware arrays.
  - `ModelVisitor`: Detects Mongoose schemas, Prisma client invocations, Sequelize definitions.
  - `EnvVisitor`: Detects `process.env[KEY]` and `process.env.KEY` accesses.
  - `SymbolExportVisitor`: Indexes exported and internal symbols with exact start/end line and column coordinates.

## Consequences
- **Positive:**
  - 100% deterministic parsing with zero execution of untrusted code.
  - High resilience to syntactic idiosyncrasies via Babel's error-recovery mode.
  - Works out of the box in pure Node.js environments on Windows, macOS, and Linux without native C++ compilation dependencies.
  - Extracts exact character offsets, line numbers, and token spans for verified evidence citing.
- **Negative:**
  - Parsing very large repositories (100k+ LOC) incurs moderate memory overhead in Node.js (mitigated by worker thread batching and streaming traversal).
