import { useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ProductType,
  createProductSchema,
  type CreateProductRequest,
  type ProductResponse,
  type KitComponentRequest,
} from "@orderflow/contracts";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { Table, tableStyles } from "../components/Table";
import { Modal, ModalActions } from "../components/Modal";
import { Loading } from "../components/Loading";
import { EmptyState } from "../components/EmptyState";
import { ErrorMessage } from "../components/ErrorMessage";
import { Badge } from "../components/Badge";
import { productsApi } from "../api/services";
import { formatCurrency, PRODUCT_TYPE_LABELS } from "../utils/format";
import styles from "./ProductsPage.module.css";

export function ProductsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editing, setEditing] = useState<ProductResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [components, setComponents] = useState<KitComponentRequest[]>([]);
  const [newComponent, setNewComponent] = useState<KitComponentRequest>({
    componentProductId: "",
    quantity: 1,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["products", page, searchQuery],
    queryFn: () => productsApi.list({ page, limit: 20, search: searchQuery || undefined }),
  });

  const simpleProductsQuery = useQuery({
    queryKey: ["products", "simple"],
    queryFn: () => productsApi.list({ type: ProductType.SIMPLE, limit: 100, active: true }),
    enabled: isModalOpen,
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateProductRequest>({
    resolver: zodResolver(createProductSchema) as Resolver<CreateProductRequest>,
    defaultValues: {
      sku: "",
      name: "",
      type: ProductType.SIMPLE,
      unitPrice: 0,
      active: true,
    },
  });

  const productType = useWatch({ control, name: "type" });

  const mutation = useMutation({
    mutationFn: async (values: CreateProductRequest) => {
      if (editing) {
        return productsApi.update(editing.id, {
          name: values.name,
          unitPrice: values.unitPrice,
          active: values.active,
        });
      }
      const created = await productsApi.create(values);
      if (values.type === ProductType.KIT && components.length > 0) {
        return productsApi.addComponents(created.id, { components });
      }
      return created;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      closeModal();
    },
  });

  const openCreate = () => {
    setEditing(null);
    setComponents([]);
    reset({ sku: "", name: "", type: ProductType.SIMPLE, unitPrice: 0, active: true });
    setIsModalOpen(true);
  };

  const openEdit = (product: ProductResponse) => {
    setEditing(product);
    setComponents([]);
    reset({
      sku: product.sku,
      name: product.name,
      type: product.type,
      unitPrice: product.unitPrice,
      active: product.active,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setComponents([]);
    mutation.reset();
  };

  const addComponent = () => {
    if (!newComponent.componentProductId || newComponent.quantity < 1) return;
    setComponents((prev) => [...prev, newComponent]);
    setNewComponent({ componentProductId: "", quantity: 1 });
  };

  const onSubmit = (values: CreateProductRequest) => {
    mutation.mutate(values);
  };

  const componentOptions =
    simpleProductsQuery.data?.data.map((p) => ({
      value: p.id,
      label: `${p.sku} — ${p.name}`,
    })) ?? [];

  return (
    <Layout title="Products">
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <div className={styles.searchField}>
            <Input
              label="Search"
              placeholder="SKU or name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSearchQuery(searchInput);
                  setPage(1);
                }
              }}
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setSearchQuery(searchInput);
              setPage(1);
            }}
          >
            Filter
          </Button>
        </div>
        <Button onClick={openCreate}>New product</Button>
      </div>

      {isLoading ? <Loading /> : null}
      {error ? <ErrorMessage error={error} /> : null}

      {!isLoading && !error && data?.data.length === 0 ? (
        <EmptyState
          title="No products registered"
          action={<Button onClick={openCreate}>New product</Button>}
        />
      ) : null}

      {data && data.data.length > 0 ? (
        <>
          <Table
            caption="Product list"
            data={data.data}
            keyExtractor={(row) => row.id}
            columns={[
              { key: "sku", header: "SKU", render: (row) => row.sku },
              { key: "name", header: "Name", render: (row) => row.name },
              {
                key: "type",
                header: "Type",
                render: (row) => (
                  <Badge variant={row.type === ProductType.KIT ? "info" : "default"}>
                    {PRODUCT_TYPE_LABELS[row.type]}
                  </Badge>
                ),
              },
              {
                key: "price",
                header: "Price",
                align: "right",
                render: (row) => formatCurrency(row.unitPrice),
              },
              {
                key: "components",
                header: "Components",
                render: (row) =>
                  row.components?.length
                    ? row.components.map((c) => `${c.componentSku} (×${c.quantity})`).join(", ")
                    : "—",
              },
              {
                key: "active",
                header: "Status",
                render: (row) => (
                  <Badge variant={row.active ? "success" : "default"}>
                    {row.active ? "Active" : "Inactive"}
                  </Badge>
                ),
              },
              {
                key: "actions",
                header: "Actions",
                render: (row) => (
                  <div className={tableStyles.actions}>
                    <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>
                      Edit
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
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editing ? "Edit product" : "New product"}
        size="large"
        footer={
          <ModalActions
            onCancel={closeModal}
            onConfirm={() => void handleSubmit(onSubmit)()}
            confirmLabel={editing ? "Save" : "Create"}
            isLoading={isSubmitting || mutation.isPending}
          />
        }
      >
        <form className={styles.formGrid} onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          {!editing ? (
            <>
              <Input label="SKU" required error={errors.sku?.message} {...register("sku")} />
              <Select
                label="Type"
                options={[
                  { value: ProductType.SIMPLE, label: "Simple" },
                  { value: ProductType.KIT, label: "Kit" },
                ]}
                error={errors.type?.message}
                {...register("type")}
              />
            </>
          ) : null}
          <Input label="Name" required error={errors.name?.message} {...register("name")} />
          <Input
            label="Unit price"
            type="number"
            step="0.01"
            min="0"
            required
            error={errors.unitPrice?.message}
            {...register("unitPrice", { valueAsNumber: true })}
          />
          <label className={styles.checkbox}>
            <input type="checkbox" {...register("active")} />
            Active product
          </label>

          {!editing && productType === ProductType.KIT ? (
            <div className={styles.components}>
              <div className={styles.componentsTitle}>Kit components</div>
              <div className={styles.componentRow}>
                <Select
                  label="Component product"
                  options={componentOptions}
                  placeholder="Select..."
                  value={newComponent.componentProductId}
                  onChange={(e) =>
                    setNewComponent((c) => ({ ...c, componentProductId: e.target.value }))
                  }
                />
                <Input
                  label="Qty"
                  type="number"
                  min="1"
                  value={newComponent.quantity}
                  onChange={(e) =>
                    setNewComponent((c) => ({ ...c, quantity: Number(e.target.value) }))
                  }
                />
                <Button type="button" variant="secondary" onClick={addComponent}>
                  Add
                </Button>
              </div>
              {components.length > 0 ? (
                <ul className={styles.componentList}>
                  {components.map((c, i) => {
                    const prod = simpleProductsQuery.data?.data.find(
                      (p) => p.id === c.componentProductId,
                    );
                    return (
                      <li key={`${c.componentProductId}-${i}`} className={styles.componentItem}>
                        {prod?.sku ?? c.componentProductId} × {c.quantity}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ) : null}

          {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
        </form>
      </Modal>
    </Layout>
  );
}
