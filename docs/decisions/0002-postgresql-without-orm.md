# ADR 0002: PostgreSQL Without ORM

## Status

Accepted

## Context

OrderFlow Operations requires relational data with ACID transactions, row-level locking for inventory reservations, and versioned SQL migrations. The team wants full control over queries, especially for `SELECT ... FOR UPDATE` patterns used in concurrent stock reservation.

## Decision

Use **PostgreSQL 16** with the `pg` (node-postgres) driver directly. No ORM.

- SQL migrations in `scripts/migrations/` tracked via `schema_migrations`
- Parameterized queries only
- Connection pool in `shared/database/pool.ts`
- Transaction helper for multi-step operations

## Alternatives Considered

### Prisma / TypeORM / Drizzle

Popular ORMs with migration tooling and type generation.

**Rejected because:** ORMs abstract away locking semantics needed for inventory reservation. Raw SQL provides clearer control over `FOR UPDATE`, deterministic lock ordering, and check constraints.

### MongoDB

Document store with flexible schema.

**Rejected because:** Inventory reservation requires strict transactional guarantees and relational joins (kits, components, reservations).

## Consequences

### Positive

- Full control over locking and transaction boundaries
- No ORM learning curve or query generation surprises
- Migrations are plain SQL, reviewable in PRs
- Check constraints enforce invariants at the database level

### Negative

- Manual mapping between rows and domain objects
- No automatic schema-to-type generation
- More boilerplate in repositories

## Trade-offs

| Aspect             | Raw SQL + pg | ORM        |
| ------------------ | ------------ | ---------- |
| Locking control    | Full         | Limited    |
| Query transparency | High         | Abstracted |
| Boilerplate        | Higher       | Lower      |
| Migration tooling  | Manual SQL   | Built-in   |

We prioritize transactional correctness and query transparency over developer convenience from an ORM.
