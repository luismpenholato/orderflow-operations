import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { UserRole } from "@orderflow/contracts";
import { Layout } from "../components/Layout";
import { Loading } from "../components/Loading";
import { ErrorMessage } from "../components/ErrorMessage";
import { Table } from "../components/Table";
import { dashboardApi } from "../api/services";
import { formatCurrency, ORDER_STATUS_LABELS } from "../utils/format";
import styles from "./DashboardPage.module.css";
import { Button } from "../components/Button";
import { useAuth } from "../auth/AuthContext";

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => dashboardApi.summary(),
  });

  return (
    <Layout title="Dashboard">
      {isLoading ? <Loading label="Loading summary..." /> : null}
      {error ? <ErrorMessage error={error} title="Failed to load dashboard" /> : null}

      {data ? (
        <>
          <section className={styles.overview}>
            <div>
              <div className={styles.kicker}>Today at a glance</div>
              <h2 className={styles.overviewTitle}>Keep orders moving without losing stock.</h2>
              <p className={styles.overviewCopy}>
                Track commercial activity, inventory pressure, and Demo ERP delivery from one
                operational view.
              </p>
            </div>
            <div className={styles.overviewActions}>
              <Button variant="secondary" onClick={() => void navigate("/orders")}>
                View orders
              </Button>
              {user?.role === UserRole.MANAGER ? (
                <Button onClick={() => void navigate("/orders/new")}>Create order</Button>
              ) : null}
            </div>
          </section>

          <div className={styles.grid}>
            <article className={[styles.card, styles.cardPrimary].join(" ")}>
              <div className={styles.cardLabel}>Total orders</div>
              <div className={styles.cardValue}>{data.totalOrders}</div>
              <div className={styles.cardHint}>Across all workflow states</div>
            </article>
            <article className={[styles.card, styles.cardSales].join(" ")}>
              <div className={styles.cardLabel}>Total sales</div>
              <div className={styles.cardValue}>{formatCurrency(data.totalSalesAmount)}</div>
              <div className={styles.cardHint}>Synchronized commercial value</div>
            </article>
            <article className={[styles.card, styles.cardPending].join(" ")}>
              <div className={styles.cardLabel}>Pending integrations</div>
              <div className={styles.cardValue}>{data.pendingIntegrations}</div>
              <div className={styles.cardHint}>Waiting for Demo ERP</div>
            </article>
            <article className={[styles.card, styles.cardFailed].join(" ")}>
              <div className={styles.cardLabel}>Failed integrations</div>
              <div className={styles.cardValue}>{data.failedIntegrations}</div>
              <div className={styles.cardHint}>Requires operational review</div>
            </article>
          </div>

          <section className={styles.section} aria-labelledby="orders-by-status">
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.kicker}>Workflow</div>
                <h2 id="orders-by-status" className={styles.sectionTitle}>
                  Orders by status
                </h2>
              </div>
            </div>
            <div className={styles.statusGrid}>
              {Object.entries(data.ordersByStatus).map(([status, count]) => (
                <div key={status} className={styles.statusItem}>
                  {ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] ?? status}
                  <span className={styles.statusCount}>{count}</span>
                </div>
              ))}
            </div>
          </section>

          {data.lowStockProducts.length > 0 ? (
            <section className={styles.lowStock} aria-labelledby="low-stock">
              <h2 id="low-stock" className={styles.sectionTitle}>
                Low stock products
              </h2>
              <Table
                caption="Low stock products"
                data={data.lowStockProducts}
                keyExtractor={(row) => row.productId}
                columns={[
                  { key: "sku", header: "SKU", render: (row) => row.productSku },
                  { key: "name", header: "Product", render: (row) => row.productName },
                  {
                    key: "available",
                    header: "Available",
                    align: "right",
                    render: (row) => (
                      <span className={styles.warning}>{row.availableQuantity}</span>
                    ),
                  },
                ]}
              />
            </section>
          ) : (
            <section className={styles.healthyStock} aria-label="Inventory health">
              <div className={styles.healthIndicator} aria-hidden="true" />
              <div>
                <strong>Inventory is within the configured threshold.</strong>
                <p>No low-stock products require attention right now.</p>
              </div>
            </section>
          )}
        </>
      ) : null}
    </Layout>
  );
}
