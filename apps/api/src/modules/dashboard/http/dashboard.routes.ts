import { Router } from "express";
import { UserRole } from "@orderflow/contracts";
import { authMiddleware } from "../../auth/http/auth.middleware.js";
import { requireRoles } from "../../auth/http/role.middleware.js";
import { dashboardController } from "./dashboard.controller.js";

export function createDashboardRoutes(): Router {
  const router = Router();

  router.use(authMiddleware);
  router.use(requireRoles(UserRole.FINANCE, UserRole.MANAGER));

  router.get("/summary", (req, res, next) => {
    dashboardController.summary(req, res).catch(next);
  });

  return router;
}
