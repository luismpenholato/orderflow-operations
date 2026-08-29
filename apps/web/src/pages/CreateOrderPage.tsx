import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  OrderType,
  createOrderSchema,
  type CreateOrderRequest,
  type OrderItemInput,
} from "@orderflow/contracts";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { ErrorMessage } from "../components/ErrorMessage";
import { Loading } from "../components/Loading";
import { customersApi, inventoryApi, ordersApi, productsApi } from "../api/services";
import { ApiClientError } from "../api/client";
import { formatCurrency } from "../utils/format";
import styles from "./CreateOrderPage.module.css";

interface OrderFormValues {
  customerId: string;
  type: OrderType;
  notes?: string;
}

const EMPTY_ITEM: OrderItemInput = { productId: "", quantity: 1 };

export function CreateOrderPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef(crypto.randomUUID());
  const isSubmittingRef = useRef(false);
  const [items, setItems] = useState<OrderItemInput[]>([{ ...EMPTY_ITEM }]);
  const [submitError, setSubmitError] = useState<unknown>(null);

  const customersQuery = useQuery({
    queryKey: ["customers", "active"],
    queryFn: () => customersApi.list({ limit: 100, active: true }),
  });

  const productsQuery = useQuery({
    queryKey: ["products", "active"],
    queryFn: () => productsApi.list({ limit: 100, active: true }),
  });

  const inventoryQuery = useQuery({
    queryKey: ["inventory", "all"],
    queryFn: () => inventoryApi.list({ limit: 100 }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(createOrderSchema.pick({ customerId: true, type: true, notes: true })),
    defaultValues: { customerId: "", type: OrderType.SALE, notes: "" },
  });

  const mutation = useMutation({
    mutationFn: (payload: CreateOrderRequest) =>
      ordersApi.create(payload, idempotencyKeyRef.current),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void navigate(`/orders/${order.id}`);
    },
  });

  const inventoryMap = useMemo(() => {
    const map = new Map<string, number>();
    inventoryQuery.data?.data.forEach((item) => {
      map.set(item.productId, item.availableQuantity);
    });
    return map;
  }, [inventoryQuery.data]);

  const productMap = useMemo(() => {
    const map = new Map<string, { name: string; sku: string; unitPrice: number }>();
    productsQuery.data?.data.forEach((p) => {
      map.set(p.id, { name: p.name, sku: p.sku, unitPrice: p.unitPrice });
    });
    return map;
  }, [productsQuery.data]);

  const stockWarnings = useMemo(() => {
    const warnings: string[] = [];
    const requestedByProduct = new Map<string, number>();

    for (const item of items) {
      if (item.productId) {
        requestedByProduct.set(
          item.productId,
          (requestedByProduct.get(item.productId) ?? 0) + item.quantity,
        );
      }
    }

    for (const [productId, requested] of requestedByProduct) {
      const available = inventoryMap.get(productId);
      const product = productMap.get(productId);
      if (available !== undefined && requested > available) {
        warnings.push(
          `${product?.sku ?? productId}: requested ${requested}, available ${available}`,
        );
      }
    }
    return warnings;
  }, [items, inventoryMap, productMap]);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      const product = productMap.get(item.productId);
      const unitPrice = item.unitPrice ?? product?.unitPrice ?? 0;
      return sum + unitPrice * item.quantity;
    }, 0);
  }, [items, productMap]);

  const updateItem = (index: number, patch: Partial<OrderItemInput>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);

  const removeItem = (index: number) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const onSubmit = async (formValues: OrderFormValues) => {
    if (isSubmittingRef.current || mutation.isPending) return;

    setSubmitError(null);
    const validItems = items.filter((item) => item.productId && item.quantity > 0);
    const parsed = createOrderSchema.safeParse({ ...formValues, items: validItems });

    if (!parsed.success) {
      setSubmitError(new Error(parsed.error.errors[0]?.message ?? "Invalid data"));
      return;
    }

    isSubmittingRef.current = true;
    try {
      await mutation.mutateAsync(parsed.data);
    } catch (error) {
      setSubmitError(error);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const customerOptions =
    customersQuery.data?.data.map((c) => ({ value: c.id, label: c.name })) ?? [];
  const productOptions =
    productsQuery.data?.data.map((p) => ({
      value: p.id,
      label: `${p.sku} — ${p.name} (${formatCurrency(p.unitPrice)})`,
    })) ?? [];

  const isLoading = customersQuery.isLoading || productsQuery.isLoading;
  const insufficientStockError =
    submitError instanceof ApiClientError &&
    (submitError.code === "INSUFFICIENT_STOCK" ||
      submitError.message.toLowerCase().includes("stock") ||
      submitError.message.toLowerCase().includes("estoque"));

  return (
    <Layout title="New order">
      {isLoading ? <Loading label="Loading data..." /> : null}

      <form className={styles.form} onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
        <div className={styles.row}>
          <Select
            label="Customer"
            options={customerOptions}
            placeholder="Select a customer..."
            error={errors.customerId?.message}
            {...register("customerId")}
          />
          <Select
            label="Order type"
            options={[
              { value: OrderType.SALE, label: "Sale" },
              { value: OrderType.EXCHANGE, label: "Exchange" },
              { value: OrderType.BONUS, label: "Bonus" },
            ]}
            error={errors.type?.message}
            {...register("type")}
          />
        </div>

        <Input label="Notes" error={errors.notes?.message} {...register("notes")} />

        <section className={styles.itemsSection} aria-labelledby="order-items">
          <div className={styles.itemsHeader}>
            <h2 id="order-items" className={styles.itemsTitle}>
              Order items
            </h2>
            <Button type="button" variant="secondary" size="sm" onClick={addItem}>
              Add item
            </Button>
          </div>

          {items.length === 0 ? (
            <div className={styles.emptyItems}>Add at least one item</div>
          ) : (
            items.map((item, index) => {
              const product = productMap.get(item.productId);
              const available = item.productId ? inventoryMap.get(item.productId) : undefined;
              const unitPrice = item.unitPrice ?? product?.unitPrice ?? 0;
              const totalRequested = items
                .filter((candidate) => candidate.productId === item.productId)
                .reduce((sum, candidate) => sum + candidate.quantity, 0);
              const hasStockWarning = available !== undefined && totalRequested > available;

              return (
                <div key={index} className={styles.itemRow}>
                  <Select
                    label={`Product ${index + 1}`}
                    id={`order-item-product-${index}`}
                    name={`order-item-product-${index}`}
                    options={productOptions}
                    placeholder="Select..."
                    value={item.productId}
                    onChange={(e) => updateItem(index, { productId: e.target.value })}
                  />
                  <Input
                    label="Quantity"
                    id={`order-item-qty-${index}`}
                    name={`order-item-qty-${index}`}
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                  />
                  <div className={styles.lineTotal}>
                    {formatCurrency(unitPrice * item.quantity)}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    aria-label={`Remove item ${index + 1}`}
                  >
                    Remove
                  </Button>
                  {hasStockWarning ? (
                    <div className={styles.stockWarning} role="alert">
                      Insufficient stock: available {available}, total requested {totalRequested}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </section>

        {stockWarnings.length > 0 ? (
          <div className={styles.stockAlert} role="alert">
            <strong>Warning — insufficient stock:</strong>
            <ul>
              {stockWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span>Items</span>
            <span>{items.filter((i) => i.productId).length}</span>
          </div>
          <div className={[styles.summaryRow, styles.summaryTotal].join(" ")}>
            <span>Estimated total</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {submitError ? (
          <ErrorMessage
            error={submitError}
            title={insufficientStockError ? "Insufficient stock" : "Failed to create order"}
          />
        ) : null}

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={() => void navigate("/orders")}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating order..." : "Create order"}
          </Button>
        </div>
      </form>
    </Layout>
  );
}
