import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { OutboxStatus } from "@orderflow/contracts";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { Select } from "../components/Select";
import { Table, tableStyles } from "../components/Table";
import { Badge } from "../components/Badge";
import { Loading } from "../components/Loading";
import { EmptyState } from "../components/EmptyState";
import { ErrorMessage } from "../components/ErrorMessage";
import { integrationsApi } from "../api/services";
import {
  formatDate,
  getOutboxStatusVariant,
  OUTBOX_STATUS_LABELS,
  SYNC_STATUS_LABELS,
} from "../utils/format";
import styles from "./IntegrationMonitorPage.module.css";

type Tab = "outbox" | "sync";

export function IntegrationMonitorPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("outbox");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const outboxQuery = useQuery({
    queryKey: ["integrations", "outbox", page, statusFilter],
    queryFn: () =>
      integrationsApi.outbox({
        page,
        limit: 20,
        status: statusFilter ? (statusFilter as OutboxStatus) : undefined,
      }),
    enabled: tab === "outbox",
  });

  const syncQuery = useQuery({
    queryKey: ["integrations", "sync-attempts", page],
    queryFn: () => integrationsApi.syncAttempts({ page, limit: 20 }),
    enabled: tab === "sync",
  });

  const retryMutation = useMutation({
    mutationFn: (outboxMessageId: string) => integrationsApi.retry(outboxMessageId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
  });

  const activeQuery = tab === "outbox" ? outboxQuery : syncQuery;

  const statusOptions = [
    { value: "", label: "All" },
    ...Object.values(OutboxStatus).map((s) => ({
      value: s,
      label: OUTBOX_STATUS_LABELS[s],
    })),
  ];

  return (
    <Layout title="Integration monitor">
      <div className={styles.tabs} role="tablist" aria-label="Integration sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "outbox"}
          className={[styles.tab, tab === "outbox" ? styles.tabActive : ""].join(" ")}
          onClick={() => {
            setTab("outbox");
            setPage(1);
          }}
        >
          Outbox
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "sync"}
          className={[styles.tab, tab === "sync" ? styles.tabActive : ""].join(" ")}
          onClick={() => {
            setTab("sync");
            setPage(1);
          }}
        >
          Sync attempts
        </button>
      </div>

      {tab === "outbox" ? (
        <div className={styles.toolbar}>
          <Select
            label="Status"
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
      ) : null}

      {activeQuery.isLoading ? <Loading /> : null}
      {activeQuery.error ? <ErrorMessage error={activeQuery.error} /> : null}
      {retryMutation.error ? (
        <ErrorMessage error={retryMutation.error} title="Failed to retry" />
      ) : null}

      {tab === "outbox" && outboxQuery.data?.data.length === 0 ? (
        <EmptyState title="No outbox messages" />
      ) : null}

      {tab === "sync" && syncQuery.data?.data.length === 0 ? (
        <EmptyState title="No sync attempts" />
      ) : null}

      {tab === "outbox" && outboxQuery.data && outboxQuery.data.data.length > 0 ? (
        <>
          <Table
            caption="Outbox messages"
            data={outboxQuery.data.data}
            keyExtractor={(row) => row.id}
            columns={[
              { key: "eventType", header: "Event", render: (row) => row.eventType },
              {
                key: "status",
                header: "Status",
                render: (row) => (
                  <Badge variant={getOutboxStatusVariant(row.status)}>
                    {OUTBOX_STATUS_LABELS[row.status]}
                  </Badge>
                ),
              },
              {
                key: "retries",
                header: "Attempts",
                align: "right",
                render: (row) => `${row.retryCount}/${row.maxRetries}`,
              },
              {
                key: "error",
                header: "Last error",
                render: (row) =>
                  row.lastError ? (
                    <span className={styles.errorCell} title={row.lastError}>
                      {row.lastError}
                    </span>
                  ) : (
                    "—"
                  ),
              },
              { key: "created", header: "Created", render: (row) => formatDate(row.createdAt) },
              {
                key: "actions",
                header: "Actions",
                render: (row) =>
                  row.status === OutboxStatus.FAILED ? (
                    <div className={tableStyles.actions}>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={retryMutation.isPending}
                        onClick={() => retryMutation.mutate(row.id)}
                      >
                        Retry
                      </Button>
                    </div>
                  ) : (
                    "—"
                  ),
              },
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
              Page {outboxQuery.data.pagination.page} of{" "}
              {outboxQuery.data.pagination.totalPages || 1}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= outboxQuery.data.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </>
      ) : null}

      {tab === "sync" && syncQuery.data && syncQuery.data.data.length > 0 ? (
        <>
          <Table
            caption="ERP sync attempts"
            data={syncQuery.data.data}
            keyExtractor={(row) => row.id}
            columns={[
              { key: "attempt", header: "#", render: (row) => row.attemptNumber },
              {
                key: "status",
                header: "Status",
                render: (row) => (
                  <Badge variant={row.status === "SUCCESS" ? "success" : "danger"}>
                    {SYNC_STATUS_LABELS[row.status]}
                  </Badge>
                ),
              },
              { key: "http", header: "HTTP", render: (row) => row.httpStatus ?? "—" },
              {
                key: "error",
                header: "Error",
                render: (row) =>
                  row.errorMessage ? (
                    <span className={styles.errorCell} title={row.errorMessage}>
                      {row.errorMessage}
                    </span>
                  ) : (
                    "—"
                  ),
              },
              { key: "created", header: "Date", render: (row) => formatDate(row.createdAt) },
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
              Page {syncQuery.data.pagination.page} of {syncQuery.data.pagination.totalPages || 1}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= syncQuery.data.pagination.totalPages}
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
