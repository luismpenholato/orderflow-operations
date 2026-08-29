export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super("NOT_FOUND", id ? `${resource} with id ${id} not found` : `${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super("UNAUTHORIZED", message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions") {
    super("FORBIDDEN", message, 403);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message, 400);
  }
}

export class InsufficientStockError extends AppError {
  constructor(message = "There is not enough available stock for one or more products.") {
    super("INSUFFICIENT_STOCK", message, 409);
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 409);
  }
}

export class IdempotencyConflictError extends AppError {
  constructor() {
    super(
      "IDEMPOTENCY_CONFLICT",
      "Request with the same idempotency key is already being processed.",
      409,
    );
  }
}
