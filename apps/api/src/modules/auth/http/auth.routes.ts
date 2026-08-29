import { Router } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../../../config.js";
import { authController } from "./auth.controller.js";
import { authMiddleware } from "./auth.middleware.js";

const loginRateLimiter = rateLimit({
  windowMs: config.loginRateLimitWindowMs,
  max: config.loginRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many login attempts. Please try again later.",
  },
});

export function createAuthRoutes(): Router {
  const router = Router();

  router.post("/login", loginRateLimiter, (req, res, next) => {
    authController.login(req, res).catch(next);
  });

  router.post("/logout", (req, res) => {
    authController.logout(req, res);
  });

  router.get("/me", authMiddleware, (req, res, next) => {
    authController.me(req, res).catch(next);
  });

  return router;
}
