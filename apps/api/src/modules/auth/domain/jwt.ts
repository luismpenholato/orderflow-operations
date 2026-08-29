import jwt from "jsonwebtoken";
import { config } from "../../../config.js";
import type { UserRole } from "@orderflow/contracts";

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}

export const AUTH_COOKIE_NAME = "orderflow_token";
