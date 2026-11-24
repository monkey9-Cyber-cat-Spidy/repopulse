# ADR 002: Dual-Mode Persistence Strategy (SQLite & PostgreSQL via Prisma ORM)

## Status
Accepted

## Context
RepoPulse has two primary usage modalities:
1. **Developer CLI / Local Mode:** An engineer runs `repopulse scan .` or launches the local interactive web interface on their workstation. Requiring a running PostgreSQL instance or external Docker daemon creates severe adoption friction and fails in environments without container privileges.
2. **Enterprise Cloud / Team Mode:** Teams run RepoPulse in CI/CD pipelines or as a shared internal service analyzing multiple repositories concurrently, requiring ACID guarantees, relational indexing, and multi-tenant persistence.

We considered:
- Flat JSON files on disk (like ShopLedger's `db.json`): Prone to write concurrency race conditions, lack of secondary indices, poor query performance on large graphs.
- PostgreSQL only: Excellent query performance, but high barrier to entry for local single-user CLI runs.
- In-memory only: Ephemeral, loses scan history and evidence audit logs across restarts.

## Decision
We adopt **Prisma ORM with Dual-Engine Configuration**:
- **SQLite (Default Local Engine):** Packaged with zero configuration. Database file resides locally in `.repopulse/data.db` within the scanned project or user profile.
- **PostgreSQL (Production / Cloud Engine):** Activated via `DATABASE_URL=postgresql://...` environment configuration for production team deployments.
- **Prisma Schema Abstraction:** All domain models (`Repository`, `FileNode`, `Symbol`, `Dependency`, `RouteEndpoint`, `DataModel`, `ArchitectureGraph`, `DocClaim`, `EvidenceAudit`, `CharacterizationTest`) are specified in a single Prisma schema with standard relational mapping, migrations, and type-safe client generation.

## Consequences
- **Positive:**
  - Zero-friction developer experience: Instant setup for evaluation, CLI runs, and local exploration without database provisioning.
  - Seamless enterprise scale-out: Switching to managed PostgreSQL (e.g., Supabase, Neon, AWS RDS) requires only updating an environment variable.
  - Full type safety across TypeScript codebases via generated Prisma Client.
- **Negative:**
  - Subtle dialect differences between SQLite and PostgreSQL (e.g., JSON filtering, case sensitivity) must be managed using Prisma's cross-dialect abstractions.
