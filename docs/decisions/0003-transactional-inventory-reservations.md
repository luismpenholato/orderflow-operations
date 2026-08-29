# ADR 0003: Transactional Inventory Reservations

## Status

Accepted

## Context

OrderFlow must reserve stock when orders are created. Multiple API instances may process concurrent requests for the same product. In-memory locks do not work across processes. Kits must expand into component products before reservation.

Available quantity is `on_hand_quantity - reserved_quantity`. Kits have no independent balance; availability is derived from components.

## Decision

Implement inventory reservation inside a **single PostgreSQL transaction**:

1. Expand kit line items into component products
2. Consolidate duplicate component quantities
3. Lock `inventory_balances` rows in deterministic order (`product_id ASC`) with `SELECT ... FOR UPDATE`
4. Verify available quantity for each component
5. Increment `reserved_quantity` and create `inventory_reservations` records
6. Update order status atomically
7. Commit or rollback as a unit

Cancellation releases reservations once: set `released_at`, decrement `reserved_quantity`, reject repeat cancel.

## Alternatives Considered

### In-Memory Locking

Mutex per product in Node.js process memory.

**Rejected because:** Does not work with multiple API instances behind a load balancer.

### Optimistic Concurrency (Version Column)

Retry on conflict using a version field.

**Rejected because:** High contention on popular SKUs causes excessive retries and poor UX under load.

### Redis Distributed Lock

External lock before database update.

**Rejected because:** Adds infrastructure dependency. PostgreSQL row locks are sufficient and co-located with data.

### Separate Reservation Service

Microservice dedicated to inventory.

**Rejected because:** Over-engineering for MVP scope. Transactional reservation in the monolith is simpler and correct.

## Consequences

### Positive

- Correct under concurrent load with multiple API workers
- No external lock infrastructure
- Kit expansion handled in one place
- Database constraints prevent reserved > on_hand

### Negative

- Lock ordering must be maintained when adding new reservation paths
- Long transactions under high contention may cause waits
- Kit availability requires component lookup on every read

## Trade-offs

| Aspect              | DB Row Locks | In-Memory | Redis Lock  |
| ------------------- | ------------ | --------- | ----------- |
| Multi-instance safe | Yes          | No        | Yes         |
| Infrastructure      | None         | None      | Redis       |
| Complexity          | Medium       | Low       | Medium-High |

We accept transaction duration trade-offs in exchange for correctness without additional infrastructure.
