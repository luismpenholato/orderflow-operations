# ADR 0004: Outbox Pattern

## Status

Accepted

## Context

When an order is created with sufficient stock, OrderFlow must persist the order and notify the external Demo ERP. Network calls to the ERP cannot happen inside a database transaction (they are slow and unreliable). These steps must remain consistent: an order in `SYNC_PENDING` must have a corresponding outbox message.

## Decision

Implement the **transactional outbox pattern**:

1. Within the same database transaction as order creation, insert a row into `outbox_messages`
2. An in-process worker polls pending messages using `FOR UPDATE SKIP LOCKED`
3. Each delivery attempt is logged in `erp_sync_attempts`
4. Failed messages are retried up to `OUTBOX_MAX_RETRIES`, then marked `FAILED`

Outbox message statuses: `PENDING` → `PROCESSING` → `PROCESSED` or `FAILED`.

## Alternatives Considered

### Synchronous ERP Call

Call the ERP API directly within the order creation request handler.

**Rejected because:** ERP latency and failures would block the user response.

### Fire-and-Forget

Commit the order, then call ERP asynchronously without persistence.

**Rejected because:** Process crash between commit and ERP call loses the sync event permanently.

### Message Broker (RabbitMQ, Kafka)

Publish events to a queue after commit.

**Rejected because:** Adds infrastructure dependency. The transactional outbox achieves the same reliability with only PostgreSQL.

## Consequences

### Positive

- Guaranteed at-least-once delivery (message persisted before commit)
- Full audit trail via sync attempts table
- Manual retry support for operations team
- `SKIP LOCKED` enables safe concurrent workers

### Negative

- In-process worker stops when API process stops
- Polling introduces latency (default 5s interval)
- Duplicate delivery possible (mitigated by ERP idempotency keys)

## Trade-offs

| Aspect             | Transactional Outbox | Message Broker | Sync Call   |
| ------------------ | -------------------- | -------------- | ----------- |
| Infrastructure     | PostgreSQL only      | Broker + DB    | None        |
| Delivery guarantee | At-least-once        | At-least-once  | Best-effort |
| User response time | Fast (async)         | Slow (blocked) | Slow        |

We accept polling latency and in-process coupling in exchange for zero additional infrastructure and strong consistency guarantees.
