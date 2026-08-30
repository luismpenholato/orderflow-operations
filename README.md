# OrderFlow Operations

[![CI](https://github.com/luismpenholato/orderflow-operations/actions/workflows/ci.yml/badge.svg)](https://github.com/luismpenholato/orderflow-operations/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/node-%3E%3D24.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-luismpenholato-ea4aaa?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/luismpenholato)

Production-like commercial operations MVP for order management, inventory reservation, and ERP synchronization — built as a learning and portfolio project.

---

## Table of Contents

[Quick start](#quick-start) · [Features](#features) · [Architecture](#architecture-overview) · [Configuration](#configuration) · [API](#api-overview) · [Testing](#testing) · [Deployment](#deployment)

Start with [Project Status](#project-status) for limitations. Detailed guides cover [inventory reservations](docs/inventory-reservation.md), [ERP synchronization](docs/erp-synchronization.md), and [architecture decisions](docs/decisions/).

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

- **Customer & product catalog** — Create, list, view and update records with pagination, search, and role-based access
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
- **npm** included with Node.js 24
- **Docker with Compose v2** for the local database; Docker is also required by the integration test suite
- A local PostgreSQL 16 instance can replace Compose for development, but not the Testcontainers-based tests
- **Git**

---

## Quick Start

The following commands use Bash, Git Bash or a POSIX-compatible shell. All commands run from the repository root.

```bash
# Clone the repository
git clone https://github.com/luismpenholato/orderflow-operations.git
cd orderflow-operations

# Install dependencies
npm ci

# Compile the shared package before starting its consumers
npm run build -w @orderflow/contracts

# Start PostgreSQL and wait for its health check
docker compose up -d --wait

# Required by migration and seed scripts; use only for local development
export DATABASE_URL="postgresql://orderflow:orderflow_dev@localhost:5432/orderflow"

# Run migrations and seed demo data
npm run db:migrate
npm run db:seed

# Start API, web, and ERP mock concurrently
npm run dev
```

**PowerShell:** use the same commands, replacing the `export` line with:

```powershell
$env:DATABASE_URL = "postgresql://orderflow:orderflow_dev@localhost:5432/orderflow"
```

Keep that variable in the terminal running migrations, seeds and the applications. The migration and seed scripts do not load a root `.env` automatically.

If you edit shared contracts during development, run `npm run dev -w @orderflow/contracts` in another terminal to keep their compiled output up to date.

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

Try the workflow as **MANAGER**: inspect inventory, create an order with available stock, then open its details and the integration monitor to follow ERP synchronization. **SALES** starts on Orders; **FINANCE** has read access to Orders and Dashboard.

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

Export environment variables in the shell before starting the processes. The API and ERP mock also use `dotenv`, which reads `.env` from each process's working directory; npm workspace scripts run from their package directories.

Use the root [`.env.example`](.env.example) and [`deploy/.env.example`](deploy/.env.example) as references for local and deployment settings. Do not overwrite an existing environment file or commit secrets.

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

Additional settings in the [API configuration](apps/api/src/config.ts):

- `JWT_SECRET` is required when `NODE_ENV=production`; the development fallback is not used in that mode.
- `COOKIE_SECURE=true` is needed when serving authentication cookies over HTTPS in a shared deployment.
- `ERP_REQUEST_TIMEOUT_MS` defaults to `10000`; it bounds each ERP HTTP request.
- `OUTBOX_BATCH_SIZE` defaults to `10`.

---

## Database Setup

PostgreSQL is provided via Docker Compose for local development:

Set `DATABASE_URL` first as shown in [Quick Start](#quick-start).

```bash
docker compose up -d
npm run db:migrate    # Applies scripts/migrations/*.sql
npm run db:seed       # Idempotent demo data (skips if already seeded)
```

Migrations are tracked in the `schema_migrations` table. The seed script creates demo users, customers, products (including kits), sample orders, and outbox messages.

---

## Authentication & Authorization

Authentication uses email/password login with JWT stored in an HTTP-only cookie (`orderflow_token`). Business routes and `/api/auth/me` require a valid session. Login is public; logout clears the cookie without requiring an authenticated request.

| Role        | Capabilities                                                              |
| ----------- | ------------------------------------------------------------------------- |
| **SALES**   | Customers, products (read/write), orders (list/create)                    |
| **MANAGER** | All SALES capabilities + inventory, order cancel, integrations, dashboard |
| **FINANCE** | Orders (read), dashboard (read)                                           |

Login is rate-limited (10 attempts per 15 minutes by default).

---

## API Overview

Base URL: `http://localhost:3000`

| Method       | Path                                                     | Auth                    | Description                   |
| ------------ | -------------------------------------------------------- | ----------------------- | ----------------------------- |
| GET          | `/health`                                                | No                      | Liveness probe                |
| GET          | `/ready`                                                 | No                      | Readiness probe (checks DB)   |
| POST         | `/api/auth/login`                                        | No                      | Authenticate                  |
| POST         | `/api/auth/logout`                                       | No                      | Clear session cookie          |
| GET          | `/api/auth/me`                                           | Cookie                  | Current user                  |
| GET/POST/PUT | `/api/customers[/:id]`                                   | SALES, MANAGER          | List, create, view and update |
| GET/POST/PUT | `/api/products[/:id]`                                    | SALES, MANAGER          | List, create, view and update |
| POST         | `/api/products/:id/components`                           | SALES, MANAGER          | Configure kit components      |
| GET          | `/api/inventory[/:productId]`                            | MANAGER                 | Inventory balances            |
| POST         | `/api/inventory/:productId/adjustments`                  | MANAGER                 | Adjust stock                  |
| GET          | `/api/orders[/:id]`                                      | SALES, MANAGER, FINANCE | List and view orders          |
| POST         | `/api/orders`                                            | SALES, MANAGER          | Create an order               |
| POST         | `/api/orders/:id/cancel`                                 | MANAGER                 | Cancel an order               |
| GET          | `/api/integrations/outbox`, `/api/integrations/attempts` | MANAGER                 | Monitor synchronization       |
| POST         | `/api/integrations/outbox/:id/retry`                     | MANAGER                 | Retry an outbox message       |
| GET          | `/api/dashboard/summary`                                 | MANAGER, FINANCE        | Operational summary           |

HTTP request examples: [docs/requests/orderflow.http](docs/requests/orderflow.http)

Square brackets in this summary indicate list/detail variants, not literal URL characters. The catalog has no DELETE endpoint; orders support creation and cancellation, not arbitrary updates.

---

## Inventory & Reservations

When an order is created, kit line items are expanded into component products, consolidated, and checked against available stock (`on_hand - reserved`). If all components can be reserved, the order enters `SYNC_PENDING` and inventory is reserved atomically within the same database transaction. Otherwise, the order is created as `PENDING_STOCK` without reservations.

See [docs/inventory-reservation.md](docs/inventory-reservation.md).

---

## ERP Synchronization

Orders with a successful stock reservation enqueue an `ORDER_CREATED` outbox message in the same transaction. Orders in `PENDING_STOCK` do not enqueue that synchronization message. The in-process outbox worker polls pending messages, POSTs to the ERP mock with a stable idempotency key, records sync attempts, and transitions order status to `SYNCED` or `SYNC_FAILED`.

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
npm run test:unit         # API domain/application and frontend tests
npm run test:integration  # Isolated PostgreSQL via Testcontainers; requires Docker
npm test                 # Both suites above
npm run validate          # Full pipeline: format, lint, typecheck, test, build
```

The integration setup starts its own PostgreSQL container and applies migrations. It does not reuse the development database selected by `DATABASE_URL`.

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
# Serve apps/web/dist through nginx for deployment
```

Run the API and ERP mock as separate processes. Vite preview is for inspecting a build locally, not the documented VPS serving setup.

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

CI and Release use Node.js 24 and `npm ci`. Deploy VPS downloads an existing release and runs the remote update steps over SSH; it requires the configured `production` environment and VPS secrets. A push to `main` runs CI, not a deployment.

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
