import { config } from "../config.js";
import { logger } from "../shared/logging/logger.js";

export interface ErpSendResult {
  success: boolean;
  httpStatus: number;
  errorMessage?: string;
}

export async function sendToErp(
  payload: Record<string, unknown>,
  idempotencyKey: string,
  correlationId: string,
): Promise<ErpSendResult> {
  const url = `${config.erpMockUrl}/api/orders`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
        "X-Correlation-Id": correlationId,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(config.erpRequestTimeoutMs),
    });

    if (response.ok) {
      return { success: true, httpStatus: response.status };
    }

    const errorBody = await response.text().catch(() => "Unknown error");
    return {
      success: false,
      httpStatus: response.status,
      errorMessage: errorBody || `ERP returned status ${response.status}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error";
    logger.error("ERP request failed", { correlationId, error: message });
    return {
      success: false,
      httpStatus: 0,
      errorMessage: message,
    };
  }
}

export async function sendCancellationToErp(
  payload: Record<string, unknown>,
  idempotencyKey: string,
  correlationId: string,
): Promise<ErpSendResult> {
  return sendToErp(payload, idempotencyKey, correlationId);
}
