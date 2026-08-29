# OrderFlow Operations

[![CI](https://github.com/luismpenholato/orderflow-operations/actions/workflows/ci.yml/badge.svg)](https://github.com/luismpenholato/orderflow-operations/actions/workflows/ci.yml)
[![Release](https://github.com/luismpenholato/orderflow-operations/actions/workflows/release.yml/badge.svg)](https://github.com/luismpenholato/orderflow-operations/actions/workflows/release.yml)
[![Node.js](https://img.shields.io/badge/node-%3E%3D24.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-luismpenholato-ea4aaa?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/luismpenholato)

Production-like commercial operations MVP for order management, inventory reservation, and ERP synchronization — built as a learning and portfolio project.

---

## Table of Contents

1. [Overview](#overview)
2. [Project Status](#project-status)
3. [Features](#features)
4. [Architecture Overview](#architecture-overview)
5. [Tech Stack](#tech-stack)
6. [Prerequisites](#prerequisites)
7. [Quick Start](#quick-start)
8. [Project Structure](#project-structure)
9. [Configuration](#configuration)
10. [Database Setup](#database-setup)
11. [Authentication & Authorization](#authentication--authorization)
12. [API Overview](#api-overview)
13. [Inventory & Reservations](#inventory--reservations)
14. [ERP Synchronization](#erp-synchronization)
15. [Frontend Application](#frontend-application)
16. [Testing](#testing)
17. [Building](#building)
18. [Deployment](#deployment)
19. [CI/CD](#cicd)
20. [Contributing](#contributing)
21. [Security](#security)
22. [License & Acknowledgments](#license--acknowledgments)

---

## Overview

OrderFlow Operations is a modular monolith that simulates a commercial operations platform. It covers the lifecycle from customer and product catalog management through order creation, inventory reservation (including kit expansion), and asynchronous ERP synchronization via a transactional outbox pattern.

The repository is organized as an npm workspace monorepo with four applications/packages:

| Package                | Purpose                                                 |
| ---------------------- | ------------------------------------------------------- |
| `@orderflow/api`       | Express REST API, outbox worker, PostgreSQL persistence |
| `@orderflow/web`       | React SPA (Vite) for operational UI                     |
| `@orderflow/erp-mock`  | Simulated external ERP with idempotent order ingestion  |
| `@orderflow/contracts` | Shared Zod schemas, enums, and TypeScript types         |

---

## Project Status

> **This project is not production-ready.** It is an MVP / study project intended to demonstrate architecture patterns, domain modeling, and operational workflows. Do not deploy to production without a full security, scalability, and compliance review.

Known limitations at v0.1.0:

- Single-node deployment model (no horizontal scaling)
- JWT stored in HTTP-only cookies without refresh-token rotation
- ERP integration targets a local mock service, not a real ERP
- No observability stack (metrics, tracing, alerting)
- Integration tests require Docker (Testcontainers) for PostgreSQL

---

## Features

- **Customer & product catalog** — CRUD with pagination, search, and role-based access
- **Kit products** — Bundle products composed of simple components with quantity multipliers
- **Inventory management** — On-hand, reserved, and available quantities with manual adjustments
- **Order lifecycle** — Create orders with stock reservation, pending-stock fallback, and cancellation
- **Transactional outbox** — Reliable ERP sync with retries, attempt logging, and manual retry
- **Dashboard** — Order counts by status, sales totals, low-stock alerts, integration health
- **Audit trail** — Entity-level audit logs for orders and system events
- **Role-based access** — SALES, MANAGER, and FINANCE roles with route-level enforcement

---

## Architecture Overview

OrderFlow follows a **modular monolith** layout: each domain module owns its HTTP layer, application use cases, and infrastructure repositories within a single deployable API process.

```mermaid
flowchart TB
    subgraph Client
        WEB[React SPA<br/>@orderflow/web]
    end

    subgraph API["@orderflow/api (Express)"]
        AUTH[Auth Module]
        CUST[Customers]
        PROD[Products]
        INV[Inventory]
        ORD[Orders]
        INT[Integrations]
        DASH[Dashboard]
        OUTBOX[Outbox Worker]
    end

    subgraph External
        ERP[ERP Mock<br/>@orderflow/erp-mock]
    end

    DB[(PostgreSQL)]

    WEB -->|REST + cookies| API
    API --> DB
    OUTBOX -->|HTTP POST| ERP
    ERP --> DB
```

See [docs/architecture.md](docs/architecture.md) for module boundaries, data flow, and ADR references.

---

## Tech Stack

| Layer    | Technology                                       |
| -------- | ------------------------------------------------ |
| Runtime  | Node.js 24+                                      |
| Language | TypeScript 5.9                                   |
| API      | Express 5, Zod validation                        |
| Frontend | React 19, Vite 7, TanStack Query, React Router 7 |
| Database | PostgreSQL 16                                    |
| Auth     | JWT (HTTP-only cookie), bcrypt                   |
| Testing  | Vitest, Testing Library                          |
| Tooling  | ESLint 9, Prettier, npm workspaces               |

---

## Prerequisites

- **Node.js** >= 24.0.0 (see `.nvmrc`)
- **npm** >= 10 (ships with Node 24)
- **Docker** (recommended) or a local PostgreSQL 16 instance
- **Git**

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/luismpenholato/orderflow-operations.git
cd orderflow-operations

# Install dependencies
npm ci

# Start PostgreSQL
docker compose up -d

# Run migrations and seed demo data
npm run db:migrate
npm run db:seed

# Start API, web, and ERP mock concurrently
npm run dev
```

| Service    | URL                          |
| ---------- | ---------------------------- |
| Web UI     | http://localhost:5173        |
| API        | http://localhost:3000        |
| ERP Mock   | http://localhost:3001        |
| API Health | http://localhost:3000/health |

**Demo credentials** (seed data, local only):

| Email                          | Password     | Role    |
| ------------------------------ | ------------ | ------- |
| `sales@demo.orderflow.local`   | `Demo@12345` | SALES   |
| `manager@demo.orderflow.local` | `Demo@12345` | MANAGER |
| `finance@demo.orderflow.local` | `Demo@12345` | FINANCE |

---

## Project Structure

```
orderflow-operations/
├── apps/
│   ├── api/                  # REST API + outbox worker
│   │   └── src/
│   │       ├── modules/      # Domain modules (auth, customers, orders, …)
│   │       ├── shared/       # Database, errors, logging, validation
│   │       └── workers/      # Outbox poller and ERP client
│   ├── web/                  # React SPA
│   │   └── src/
│   │       ├── pages/        # Route-level pages
│   │       ├── components/   # Shared UI components
│   │       └── api/          # Fetch client
│   └── erp-mock/             # Simulated ERP service
├── packages/
│   └── contracts/            # Shared Zod schemas and enums
├── scripts/
│   ├── migrations/           # SQL migration files
│   ├── migrate.js
│   ├── seed.js
│   └── build-release.sh
├── deploy/                   # systemd, nginx, env templates
├── docs/                     # Architecture, testing, deployment guides
├── .github/                  # CI/CD workflows and templates
├── docker-compose.yml
├── vitest.config.ts
└── vitest.integration.config.ts
```

---

## Configuration

Environment variables are loaded via `dotenv`. Copy `deploy/.env.example` for a reference of all supported settings.

| Variable                  | Default                                                         | Description                  |
| ------------------------- | --------------------------------------------------------------- | ---------------------------- |
| `DATABASE_URL`            | `postgresql://orderflow:orderflow_dev@localhost:5432/orderflow` | PostgreSQL connection string |
| `API_PORT`                | `3000`                                                          | API listen port              |
| `JWT_SECRET`              | `dev-secret-change-in-production`                               | JWT signing secret           |
| `JWT_EXPIRES_IN`          | `8h`                                                            | Token expiration             |
| `CORS_ORIGIN`             | `http://localhost:5173`                                         | Allowed CORS origin          |
| `ERP_MOCK_URL`            | `http://localhost:3001`                                         | ERP mock base URL            |
| `OUTBOX_POLL_INTERVAL_MS` | `5000`                                                          | Outbox worker poll interval  |
| `OUTBOX_MAX_RETRIES`      | `5`                                                             | Max sync retries per message |
| `ERP_MOCK_PORT`           | `3001`                                                          | ERP mock listen port         |
| `ERP_MOCK_FAILURE_RATE`   | `0`                                                             | Simulated failure rate (0–1) |

---

## Database Setup

PostgreSQL is provided via Docker Compose for local development:

```bash
docker compose up -d
npm run db:migrate    # Applies scripts/migrations/*.sql
npm run db:seed       # Idempotent demo data (skips if already seeded)
```

Migrations are tracked in the `schema_migrations` table. The seed script creates demo users, customers, products (including kits), sample orders, and outbox messages.

---

## Authentication & Authorization

Authentication uses email/password login with JWT stored in an HTTP-only cookie (`token`). All `/api/*` routes (except `/api/auth/login`) require a valid session.

| Role        | Capabilities                                                              |
| ----------- | ------------------------------------------------------------------------- |
| **SALES**   | Customers, products (read/write), orders (list/create)                    |
| **MANAGER** | All SALES capabilities + inventory, order cancel, integrations, dashboard |
| **FINANCE** | Orders (read), dashboard (read)                                           |

Login is rate-limited (10 attempts per 15 minutes by default).

---

## API Overview

Base URL: `http://localhost:3000`

| Method   | Path                     | Auth             | Description                      |
| -------- | ------------------------ | ---------------- | -------------------------------- |
| GET      | `/health`                | No               | Liveness probe                   |
| GET      | `/ready`                 | No               | Readiness probe (checks DB)      |
| POST     | `/api/auth/login`        | No               | Authenticate                     |
| POST     | `/api/auth/logout`       | Cookie           | Clear session                    |
| GET      | `/api/auth/me`           | Cookie           | Current user                     |
| CRUD     | `/api/customers`         | SALES, MANAGER   | Customer management              |
| CRUD     | `/api/products`          | SALES, MANAGER   | Product catalog                  |
| GET/POST | `/api/inventory`         | MANAGER          | Inventory balances & adjustments |
| CRUD     | `/api/orders`            | Role-based       | Order lifecycle                  |
| GET/POST | `/api/integrations`      | MANAGER          | Outbox & sync attempts           |
| GET      | `/api/dashboard/summary` | MANAGER, FINANCE | Operational summary              |

HTTP request examples: [docs/requests/orderflow.http](docs/requests/orderflow.http)

---

## Inventory & Reservations

When an order is created, kit line items are expanded into component products, consolidated, and checked against available stock (`on_hand - reserved`). If all components can be reserved, the order enters `SYNC_PENDING` and inventory is reserved atomically within the same database transaction. Otherwise, the order is created as `PENDING_STOCK` without reservations.

See [docs/inventory-reservation.md](docs/inventory-reservation.md).

---

## ERP Synchronization

Successful order creation enqueues an `ORDER_CREATED` outbox message. The in-process outbox worker polls pending messages, POSTs to the ERP mock with idempotency keys, records sync attempts, and transitions order status to `SYNCED` or `SYNC_FAILED`.

See [docs/erp-synchronization.md](docs/erp-synchronization.md).

---

## Frontend Application

The React SPA provides pages for dashboard, customers, products, inventory, orders (list/create/detail), and integration monitoring. API calls use cookie-based auth with `credentials: "include"` and automatic correlation ID headers.

Routes:

| Path            | Page               |
| --------------- | ------------------ |
| `/login`        | Login              |
| `/`             | Dashboard          |
| `/customers`    | Customer list      |
| `/products`     | Product catalog    |
| `/inventory`    | Inventory balances |
| `/orders`       | Order list         |
| `/orders/new`   | Create order       |
| `/orders/:id`   | Order details      |
| `/integrations` | Outbox monitor     |

---

## Testing

```bash
npm run test              # Unit tests (API + web + contracts)
npm run test:integration  # Integration tests (requires PostgreSQL)
npm run validate          # Full pipeline: format, lint, typecheck, test, build
```

See [docs/testing.md](docs/testing.md) for strategy and coverage details.

---

## Building

```bash
npm run build
```

Build order: `@orderflow/contracts` → `@orderflow/api` → `@orderflow/erp-mock` → `@orderflow/web`

Production start:

```bash
npm run start -w @orderflow/api
npm run start -w @orderflow/erp-mock
# Serve apps/web/dist via nginx or vite preview
```

Release artifacts: `scripts/build-release.sh`

---

## Deployment

VPS deployment uses systemd services, nginx reverse proxy, and PostgreSQL. See [docs/deployment/vps.md](docs/deployment/vps.md) for install, update, and rollback procedures.

Deploy assets live in `deploy/`:

- `deploy/systemd/` — systemd unit files
- `deploy/nginx/` — nginx site configuration
- `deploy/install.sh` — first-time install script
- `deploy/update.sh` — update script
- `deploy/.env.example` — environment template

---

## CI/CD

| Workflow         | Trigger                      | Purpose                                         |
| ---------------- | ---------------------------- | ----------------------------------------------- |
| `ci.yml`         | Push/PR to `main`            | Lint, typecheck, test, build                    |
| `release.yml`    | Tag `v*.*.*`                 | Validate version, build tarball, GitHub Release |
| `deploy-vps.yml` | Manual (`workflow_dispatch`) | Deploy to production VPS                        |

All workflows use Node.js 24 and `npm ci`.

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before opening issues or pull requests.

Architecture decisions are documented as ADRs in [docs/decisions/](docs/decisions/).

---

## Security

Report vulnerabilities privately following [SECURITY.md](SECURITY.md). Do not open public issues for security concerns.

This MVP uses demo credentials in seed data and a default JWT secret — **never use these in any shared or production environment**.

---

## License & Acknowledgments

Copyright (c) 2026 Luis Mauro Penholato

Released under the [MIT License](LICENSE).

Built as a study project to explore modular monolith architecture, transactional outbox patterns, and operational domain modeling.
