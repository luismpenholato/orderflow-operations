import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCustomerSchema,
  type CreateCustomerRequest,
  type CustomerResponse,
} from "@orderflow/contracts";
import { Layout } from "../components/Layout";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Table, tableStyles } from "../components/Table";
import { Modal, ModalActions } from "../components/Modal";
import { Loading } from "../components/Loading";
import { EmptyState } from "../components/EmptyState";
import { ErrorMessage } from "../components/ErrorMessage";
import { Badge } from "../components/Badge";
import { customersApi } from "../api/services";
import { formatDate } from "../utils/format";
import styles from "./CustomersPage.module.css";

export function CustomersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [editing, setEditing] = useState<CustomerResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["customers", page, search],
    queryFn: () => customersApi.list({ page, limit: 20, search: search || undefined }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCustomerRequest>({
    resolver: zodResolver(createCustomerSchema) as Resolver<CreateCustomerRequest>,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      documentNumber: "",
      address: "",
      active: true,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateCustomerRequest) =>
      editing ? customersApi.update(editing.id, values) : customersApi.create(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      closeModal();
    },
  });

  const openCreate = () => {
    setEditing(null);
    reset({ name: "", email: "", phone: "", documentNumber: "", address: "", active: true });
    setIsModalOpen(true);
  };

  const openEdit = (customer: CustomerResponse) => {
    setEditing(customer);
    reset({
      name: customer.name,
      email: customer.email,
      phone: customer.phone ?? "",
      documentNumber: customer.documentNumber ?? "",
      address: customer.address ?? "",
      active: customer.active,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    mutation.reset();
  };

  const onSubmit = (values: CreateCustomerRequest) => {
    mutation.mutate(values);
  };

  return (
    <Layout title="Customers">
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <div className={styles.searchField}>
            <Input
              label="Search"
              placeholder="Name or email..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setSearch(searchInput);
                  setPage(1);
                }
              }}
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setSearch(searchInput);
              setPage(1);
            }}
          >
            Filter
          </Button>
        </div>
        <Button onClick={openCreate}>New customer</Button>
      </div>

      {isLoading ? <Loading /> : null}
      {error ? <ErrorMessage error={error} /> : null}

      {!isLoading && !error && data?.data.length === 0 ? (
        <EmptyState
          title="No customers found"
          description="Create the first customer to get started."
          action={<Button onClick={openCreate}>New customer</Button>}
        />
      ) : null}

      {data && data.data.length > 0 ? (
        <>
          <Table
            caption="Customer list"
            data={data.data}
            keyExtractor={(row) => row.id}
            columns={[
              { key: "name", header: "Name", render: (row) => row.name },
              { key: "email", header: "Email", render: (row) => row.email },
              { key: "phone", header: "Phone", render: (row) => row.phone ?? "—" },
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
                key: "created",
                header: "Created",
                render: (row) => formatDate(row.createdAt),
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
        title={editing ? "Edit customer" : "New customer"}
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
          <Input label="Name" required error={errors.name?.message} {...register("name")} />
          <Input
            label="Email"
            type="email"
            required
            error={errors.email?.message}
            {...register("email")}
          />
          <Input label="Phone" error={errors.phone?.message} {...register("phone")} />
          <Input
            label="Document"
            error={errors.documentNumber?.message}
            {...register("documentNumber")}
          />
          <Input label="Address" error={errors.address?.message} {...register("address")} />
          <label className={styles.checkbox}>
            <input type="checkbox" {...register("active")} />
            Active customer
          </label>
          {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
        </form>
      </Modal>
    </Layout>
  );
}
