import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { OrderStatus, UserRole } from "@orderflow/contracts";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { Select } from "../components/Select";
import { Table } from "../components/Table";
import { Loading } from "../components/Loading";
import { EmptyState } from "../components/EmptyState";
import { ErrorMessage } from "../components/ErrorMessage";
import { Badge } from "../components/Badge";
import { ordersApi } from "../api/services";
import {
  formatCurrency,
  formatDate,
  getOrderStatusVariant,
  ORDER_STATUS_LABELS,
  ORDER_TYPE_LABELS,
} from "../utils/format";
import styles from "./OrdersPage.module.css";
import { useAuth } from "../auth/AuthContext";

export function OrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["orders", page, status],
    queryFn: () =>
      ordersApi.list({
        page,
        limit: 20,
        status: status ? (status as OrderStatus) : undefined,
      }),
  });

  const statusOptions = [
    { value: "", label: "All statuses" },
    ...Object.values(OrderStatus).map((s) => ({
      value: s,
      label: ORDER_STATUS_LABELS[s],
    })),
  ];
  const canCreateOrder = user?.role === UserRole.SALES || user?.role === UserRole.MANAGER;

  return (
    <Layout title="Orders">
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <Select
            label="Status"
            options={statusOptions}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {canCreateOrder ? (
          <Button onClick={() => void navigate("/orders/new")}>New order</Button>
        ) : null}
      </div>

      {isLoading ? <Loading /> : null}
      {error ? <ErrorMessage error={error} /> : null}

      {!isLoading && !error && data?.data.length === 0 ? (
        <EmptyState
          title="No orders found"
          action={
            canCreateOrder ? (
              <Button onClick={() => void navigate("/orders/new")}>Create order</Button>
            ) : undefined
          }
        />
      ) : null}

      {data && data.data.length > 0 ? (
        <>
          <Table
            caption="Order list"
            data={data.data}
            keyExtractor={(row) => row.id}
            onRowClick={(row) => void navigate(`/orders/${row.id}`)}
            columns={[
              { key: "number", header: "Order #", render: (row) => row.orderNumber },
              { key: "customer", header: "Customer", render: (row) => row.customerName },
              { key: "type", header: "Type", render: (row) => ORDER_TYPE_LABELS[row.type] },
              {
                key: "status",
                header: "Status",
                render: (row) => (
                  <Badge variant={getOrderStatusVariant(row.status)}>
                    {ORDER_STATUS_LABELS[row.status]}
                  </Badge>
                ),
              },
              {
                key: "total",
                header: "Total",
                align: "right",
                render: (row) => formatCurrency(row.totalAmount),
              },
              { key: "created", header: "Created", render: (row) => formatDate(row.createdAt) },
            ]}
          />
          <div className={styles.pagination}>
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span>
              Page {data.pagination.page} of {data.pagination.totalPages || 1}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </>
      ) : null}
    </Layout>
  );
}
