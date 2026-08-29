import type { Request } from "express";
import type { ZodTypeAny } from "zod";
import type { z } from "zod";

export function validateBody<T extends ZodTypeAny>(schema: T) {
  return (req: Request): z.infer<T> => {
    return schema.parse(req.body);
  };
}

export function validateQuery<T extends ZodTypeAny>(schema: T) {
  return (req: Request): z.infer<T> => {
    return schema.parse(req.query);
  };
}

export function validateParams<T extends ZodTypeAny>(schema: T) {
  return (req: Request): z.infer<T> => {
    return schema.parse(req.params);
  };
}
