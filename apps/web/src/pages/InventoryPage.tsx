import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  inventoryAdjustmentSchema,
  type InventoryAdjustmentRequest,
  type InventoryBalanceResponse,
} from "@orderflow/contracts";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Table, tableStyles } from "../components/Table";
import { Modal, ModalActions } from "../components/Modal";
import { Loading } from "../components/Loading";
import { EmptyState } from "../components/EmptyState";
import { ErrorMessage } from "../components/ErrorMessage";
import { inventoryApi } from "../api/services";
import { formatDate } from "../utils/format";
import styles from "./InventoryPage.module.css";

export function InventoryPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [adjusting, setAdjusting] = useState<InventoryBalanceResponse | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["inventory", page],
    queryFn: () => inventoryApi.list({ page, limit: 20 }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InventoryAdjustmentRequest>({
    resolver: zodResolver(inventoryAdjustmentSchema),
    defaultValues: { quantityDelta: 0, reason: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: InventoryAdjustmentRequest) =>
      inventoryApi.adjust(adjusting!.productId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      closeModal();
    },
  });

  const openAdjust = (item: InventoryBalanceResponse) => {
    setAdjusting(item);
    reset({ quantityDelta: 0, reason: "" });
  };

  const closeModal = () => {
    setAdjusting(null);
    mutation.reset();
  };

  const onSubmit = (values: InventoryAdjustmentRequest) => {
    mutation.mutate(values);
  };

  return (
    <Layout title="Inventory">
      {isLoading ? <Loading /> : null}
      {error ? <ErrorMessage error={error} /> : null}

      {!isLoading && !error && data?.data.length === 0 ? (
        <EmptyState title="No inventory balances found" />
      ) : null}

      {data && data.data.length > 0 ? (
        <>
          <Table
            caption="Inventory balances"
            data={data.data}
            keyExtractor={(row) => row.productId}
            columns={[
              { key: "sku", header: "SKU", render: (row) => row.productSku },
              { key: "name", header: "Product", render: (row) => row.productName },
              { key: "type", header: "Type", render: (row) => row.productType },
              {
                key: "onHand",
                header: "On hand",
                align: "right",
                render: (row) => row.onHandQuantity,
              },
              {
                key: "reserved",
                header: "Reserved",
                align: "right",
                render: (row) => row.reservedQuantity,
              },
              {
                key: "available",
                header: "Available",
                align: "right",
                render: (row) => (
                  <span className={row.availableQuantity <= 10 ? styles.lowStock : undefined}>
                    {row.availableQuantity}
                  </span>
                ),
              },
              { key: "updated", header: "Updated", render: (row) => formatDate(row.updatedAt) },
              {
                key: "actions",
                header: "Actions",
                render: (row) => (
                  <div className={tableStyles.actions}>
                    <Button size="sm" variant="secondary" onClick={() => openAdjust(row)}>
                      Adjust
                    </Button>
                  </div>
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

      <Modal
        isOpen={adjusting !== null}
        onClose={closeModal}
        title="Inventory adjustment"
        footer={
          <ModalActions
            onCancel={closeModal}
            onConfirm={() => void handleSubmit(onSubmit)()}
            confirmLabel="Apply adjustment"
            isLoading={isSubmitting || mutation.isPending}
          />
        }
      >
        {adjusting ? (
          <div className={styles.productInfo}>
            {adjusting.productSku} — {adjusting.productName}
            <br />
            Available: {adjusting.availableQuantity}
          </div>
        ) : null}
        <form className={styles.formGrid} onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          <Input
            label="Quantity change"
            type="number"
            hint="Use positive values for inbound and negative values for outbound"
            required
            error={errors.quantityDelta?.message}
            {...register("quantityDelta", { valueAsNumber: true })}
          />
          <Input label="Reason" required error={errors.reason?.message} {...register("reason")} />
          {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
        </form>
      </Modal>
    </Layout>
  );
}
