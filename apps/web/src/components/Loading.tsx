import styles from "./Loading.module.css";

interface LoadingProps {
  label?: string;
  inline?: boolean;
}

export function Loading({ label = "Carregando...", inline = false }: LoadingProps) {
  return (
    <div
      className={[styles.container, inline ? styles.inline : ""].filter(Boolean).join(" ")}
      role="status"
      aria-live="polite"
    >
      <div className={styles.spinner} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </div>
  );
}
