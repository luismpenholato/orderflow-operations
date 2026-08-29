import { z } from "zod";
import { UserRole } from "./enums.js";

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum([UserRole.SALES, UserRole.MANAGER, UserRole.FINANCE]),
});

export type UserResponse = z.infer<typeof userResponseSchema>;

export const loginResponseSchema = z.object({
  user: userResponseSchema,
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;
