import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isCancellableStatus } from "@orderflow/contracts";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { Table } from "../components/Table";
import { Badge } from "../components/Badge";
import { Loading } from "../components/Loading";
import { ErrorMessage } from "../components/ErrorMessage";
import { ordersApi } from "../api/services";
import {
  formatCurrency,
  formatDate,
  getOrderStatusVariant,
  ORDER_STATUS_LABELS,
  ORDER_TYPE_LABELS,
  SYNC_STATUS_LABELS,
} from "../utils/format";
import styles from "./OrderDetailsPage.module.css";

export function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: order,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["orders", id],
    queryFn: () => ordersApi.get(id!),
    enabled: Boolean(id),
  });

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancel(id!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orders", id] });
    },
  });

  if (isLoading) {
    return (
      <Layout title="Order details">
        <Loading />
      </Layout>
    );
  }

  if (error || !order) {
    return (
      <Layout title="Order details">
        <ErrorMessage error={error ?? new Error("Order not found")} />
        <Button variant="secondary" onClick={() => void navigate("/orders")}>
          Back
        </Button>
      </Layout>
    );
  }

  const canCancel = isCancellableStatus(order.status);

  return (
    <Layout title="Order details">
      <div className={styles.header}>
        <div className={styles.meta}>
          <div className={styles.orderNumber}>{order.orderNumber}</div>
          <div className={styles.metaRow}>
            Customer: <strong>{order.customerName}</strong>
          </div>
          <div className={styles.metaRow}>
            Type: <strong>{ORDER_TYPE_LABELS[order.type]}</strong> · Total:{" "}
            <strong>{formatCurrency(order.totalAmount)}</strong>
          </div>
          <div className={styles.metaRow}>Created {formatDate(order.createdAt)}</div>
          <Badge variant={getOrderStatusVariant(order.status)}>
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => void navigate("/orders")}>
            Back
          </Button>
          {canCancel ? (
            <Button
              variant="danger"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel order"}
            </Button>
          ) : null}
        </div>
      </div>

      {cancelMutation.error ? <ErrorMessage error={cancelMutation.error} /> : null}

      {order.notes ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Notes</h2>
          <p>{order.notes}</p>
        </section>
      ) : null}

      <section className={styles.section} aria-labelledby="order-items-detail">
        <h2 id="order-items-detail" className={styles.sectionTitle}>
          Items
        </h2>
        <Table
          caption="Order items"
          data={order.items}
          keyExtractor={(row) => row.id}
          columns={[
            { key: "sku", header: "SKU", render: (row) => row.productSku },
            { key: "name", header: "Product", render: (row) => row.productName },
            { key: "qty", header: "Qty", align: "right", render: (row) => row.quantity },
            {
              key: "unit",
              header: "Unit price",
              align: "right",
              render: (row) => formatCurrency(row.unitPrice),
            },
            {
              key: "total",
              header: "Total",
              align: "right",
              render: (row) => formatCurrency(row.lineTotal),
            },
          ]}
        />
      </section>

      <div className={styles.grid}>
        <section className={styles.section} aria-labelledby="reservations">
          <h2 id="reservations" className={styles.sectionTitle}>
            Stock reservations
          </h2>
          {order.reservations && order.reservations.length > 0 ? (
            <Table
              caption="Reservations"
              data={order.reservations}
              keyExtractor={(row) => row.id}
              columns={[
                { key: "sku", header: "SKU", render: (row) => row.productSku },
                { key: "qty", header: "Qty", align: "right", render: (row) => row.quantity },
                { key: "created", header: "Created", render: (row) => formatDate(row.createdAt) },
                {
                  key: "released",
                  header: "Released",
                  render: (row) => (row.releasedAt ? formatDate(row.releasedAt) : "—"),
                },
              ]}
            />
          ) : (
            <div className={styles.emptySection}>No reservations recorded</div>
          )}
        </section>

        <section className={styles.section} aria-labelledby="sync-attempts">
          <h2 id="sync-attempts" className={styles.sectionTitle}>
            Sync attempts
          </h2>
          {order.syncAttempts && order.syncAttempts.length > 0 ? (
            <Table
              caption="Sync attempts"
              data={order.syncAttempts}
              keyExtractor={(row) => row.id}
              columns={[
                { key: "attempt", header: "#", render: (row) => row.attemptNumber },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => (
                    <Badge variant={row.status === "SUCCESS" ? "success" : "danger"}>
                      {SYNC_STATUS_LABELS[row.status as keyof typeof SYNC_STATUS_LABELS] ??
                        row.status}
                    </Badge>
                  ),
                },
                { key: "http", header: "HTTP", render: (row) => row.httpStatus ?? "—" },
                { key: "error", header: "Error", render: (row) => row.errorMessage ?? "—" },
                { key: "date", header: "Date", render: (row) => formatDate(row.createdAt) },
              ]}
            />
          ) : (
            <div className={styles.emptySection}>No sync attempts</div>
          )}
        </section>
      </div>

      <section className={styles.section} aria-labelledby="audit-history">
        <h2 id="audit-history" className={styles.sectionTitle}>
          Audit history
        </h2>
        {order.auditLogs && order.auditLogs.length > 0 ? (
          <div>
            {order.auditLogs.map((log) => (
              <div key={log.id} className={styles.auditEntry}>
                <div className={styles.auditAction}>{log.action}</div>
                <div className={styles.auditMeta}>
                  {formatDate(log.createdAt)} · {log.entityType}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptySection}>No audit records</div>
        )}
      </section>
    </Layout>
  );
}
