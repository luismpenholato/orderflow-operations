# ADR 0001: Modular Monolith Architecture

## Status

Accepted

## Context

OrderFlow Operations needs to manage customers, products, inventory, orders, and ERP synchronization. The project is an MVP / study effort with a single developer and no immediate scaling requirements.

We need an architecture that:

- Keeps domain logic organized and testable
- Avoids premature microservices complexity
- Allows a single deployable unit for VPS hosting
- Supports clear module boundaries for future extraction if needed

## Decision

Adopt a **modular monolith** architecture within a single Node.js API process (`@orderflow/api`). Each domain module owns its HTTP routes, application use cases, and infrastructure repositories.

Module structure:

```
modules/<domain>/
├── http/
├── application/
├── domain/          (when pure logic exists)
└── infrastructure/
```

Shared cross-cutting code lives in `shared/` (database, errors, logging, validation).

## Alternatives Considered

### Microservices

Split each domain into independent services with separate databases and API gateways.

**Rejected because:** Operational overhead (service discovery, distributed transactions, deployment complexity) is unjustified for an MVP with no scaling requirements.

### Layered (Horizontal) Architecture

Organize by technical layer (`controllers/`, `services/`, `repositories/`) across all domains.

**Rejected because:** Changes to a single domain touch many unrelated directories. Module boundaries are harder to enforce.

### Serverless Functions

Deploy each endpoint as a separate cloud function.

**Rejected because:** Cold starts, connection pooling challenges with PostgreSQL, and vendor lock-in conflict with the VPS deployment goal.

## Consequences

### Positive

- Simple deployment (one API process + one worker in-process)
- ACID transactions across modules (orders + inventory + outbox in one transaction)
- Easy local development with `npm run dev`
- Clear ownership per domain module

### Negative

- All modules scale together (cannot scale orders independently)
- A bug in one module can crash the entire API process
- Module boundary violations require discipline (no enforced package boundaries)

## Trade-offs

| Aspect                    | Modular Monolith    | Microservices          |
| ------------------------- | ------------------- | ---------------------- |
| Deployment complexity     | Low                 | High                   |
| Cross-module transactions | Native (PostgreSQL) | Requires saga/outbox   |
| Team scaling              | Single team         | Multiple teams         |
| Operational cost          | Low (VPS)           | Higher (orchestration) |

We accept reduced independent scalability in exchange for simplicity and transactional integrity, which is critical for inventory reservation and outbox patterns.
