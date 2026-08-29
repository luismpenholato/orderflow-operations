import { ApiClientError } from "../api/client";
import styles from "./ErrorMessage.module.css";

interface ErrorMessageProps {
  error: unknown;
  title?: string;
}

function getMessage(error: unknown): { message: string; detail?: string } {
  if (error instanceof ApiClientError) {
    return {
      message: error.message,
      detail: `Código: ${error.code} · Correlation ID: ${error.correlationId}`,
    };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: "Ocorreu um erro inesperado." };
}

export function ErrorMessage({ error, title = "Erro" }: ErrorMessageProps) {
  const { message, detail } = getMessage(error);

  return (
    <div className={styles.error} role="alert">
      <div className={styles.title}>{title}</div>
      <div>{message}</div>
      {detail ? <div className={styles.detail}>{detail}</div> : null}
    </div>
  );
}
