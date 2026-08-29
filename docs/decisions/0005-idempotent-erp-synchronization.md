# ADR 0005: Idempotent ERP Synchronization

## Status

Accepted

## Context

The outbox worker delivers order events to the Demo ERP with at-least-once semantics. Network failures, retries, and concurrent workers can cause duplicate delivery attempts. The ERP must not create duplicate orders for the same business event.

Order creation in the API also accepts an `Idempotency-Key` header to prevent duplicate orders from client retries.

## Decision

Implement idempotency at two levels:

**API order creation:**

- Accept optional `Idempotency-Key` header
- Unique partial index on `orders.idempotency_key`
- Return existing order when key matches

**ERP synchronization:**

- Generate deterministic idempotency key per outbox message and attempt
- Demo ERP mock requires `Idempotency-Key` header on `POST /api/orders`
- ERP stores keys in `erp_idempotency_keys` and returns cached response for duplicates
- Outbox worker records each attempt in `erp_sync_attempts`

## Alternatives Considered

### Exactly-Once Delivery

Guarantee single ERP order creation via distributed transactions.

**Rejected because:** Not achievable across HTTP boundaries without complex two-phase commit infrastructure.

### Deduplication by Order ID Only

ERP checks if order ID already exists.

**Rejected because:** Insufficient for partial failures where ERP received the request but response was lost. Idempotency keys are the industry standard.

### No Client Idempotency

Only protect ERP side.

**Rejected because:** Client retries (double-click, network timeout) would create duplicate orders before sync.

## Consequences

### Positive

- Safe retries at API and worker levels
- Audit trail of all sync attempts
- ERP mock demonstrates real-world idempotency contract

### Negative

- Idempotency keys consume storage indefinitely in MVP (no TTL)
- Key collision if clients reuse keys for different payloads
- Cancellation events need separate idempotency handling

## Trade-offs

| Aspect            | Idempotency Keys | Order ID Dedup | Exactly-Once |
| ----------------- | ---------------- | -------------- | ------------ |
| Retry safety      | High             | Medium         | N/A          |
| Client protection | Yes              | No             | Yes          |
| Complexity        | Low              | Lower          | Very High    |

We accept indefinite key storage in MVP in exchange for simple, proven idempotency semantics.
