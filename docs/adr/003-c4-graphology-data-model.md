# ADR 003: C4 Hierarchical Graph Data Model using Graphology and React Flow

## Status
Accepted

## Context
Codebase architecture cannot be understood through flat dependency matrices or monolithic diagrams. In a repository of 500+ files, showing every function call and import simultaneously produces an illegible "hairball" graph. 

Software architecture requires hierarchical abstraction where developers can zoom smoothly from high-level system boundaries down to atomic code declarations. The industry-standard framework for this is the **C4 Model** (Context, Containers, Components, Code).

## Decision
We implement a **Hierarchical Multigraph Engine** combining:
1. **Graphology Directed Multigraph (In-Memory Core):**
   - Nodes represent entities at 4 discrete tiers:
     - *Level 1 (Context):* Repository boundary, external SaaS APIs (Stripe, Twilio, Google Maps), external databases.
     - *Level 2 (Containers):* Web Servers, API Gateways, Background Workers, In-memory caches, Databases.
     - *Level 3 (Components):* Express Routers, Controllers, Service modules, Middleware, ORM Data Models, Configuration loaders.
     - *Level 4 (Code):* Specific Functions, Classes, AST declarations, Route handler callbacks.
   - Edges represent typed relationships: `IMPORTS`, `CALLS`, `MOUNTS_ROUTE`, `READS_ENV`, `QUERIES_MODEL`, `USES_MIDDLEWARE`, `CALLS_EXTERNAL_API`.
   - Node attributes carry evidence metadata (`filePath`, `startLine`, `endLine`, `loc`, `complexity`, `astNodeType`).
2. **React Flow + Dagre / ELKjs Layout Engine (Visualization Layer):**
   - Converts hierarchical Graphology subgraphs into custom React Flow nodes and edges.
   - Provides semantic zooming:
     - At zoom $< 0.4$: Collapses to Level 1 & 2 containers and service boundaries.
     - At zoom $0.4 - 0.8$: Expands to Level 3 component topologies with active route endpoints and data stores.
     - At zoom $> 0.8$: Unfolds Level 4 code call chains, middleware sequences, and exact line references.
   - Interactive cross-linking: Clicking any node highlights upstream dependencies and downstream callers, and displays the exact source code evidence viewer in a split drawer.

## Consequences
- **Positive:**
  - Solves the visual clutter problem through rigorous multi-level abstraction.
  - Graphology provides sub-millisecond graph algorithms (topological sort, shortest path, cycle detection, PageRank centrality for critical paths).
  - React Flow enables smooth 60fps canvas navigation, custom node badges, and deep DOM interactions.
- **Negative:**
  - Automated layout calculation for large graphs (1,000+ nodes) can be computationally heavy on the client; mitigated by server-side Dagre pre-computation and sub-graph lazy loading.
