import { Router } from "express";
import { UserRole } from "@orderflow/contracts";
import { authMiddleware } from "../../auth/http/auth.middleware.js";
import { requireRoles } from "../../auth/http/role.middleware.js";
import { integrationController } from "./integration.controller.js";

export function createIntegrationRoutes(): Router {
  const router = Router();

  router.use(authMiddleware);
  router.use(requireRoles(UserRole.MANAGER));

  router.get("/outbox", (req, res, next) => {
    integrationController.listOutbox(req, res).catch(next);
  });

  router.get("/attempts", (req, res, next) => {
    integrationController.listAttempts(req, res).catch(next);
  });

  router.post("/outbox/:id/retry", (req, res, next) => {
    integrationController.retryOutbox(req, res).catch(next);
  });

  return router;
}
