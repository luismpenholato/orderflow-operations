import { Router } from "express";
import { UserRole } from "@orderflow/contracts";
import { authMiddleware } from "../../auth/http/auth.middleware.js";
import { requireRoles } from "../../auth/http/role.middleware.js";
import { orderController } from "./order.controller.js";

export function createOrderRoutes(): Router {
  const router = Router();

  router.use(authMiddleware);

  router.get(
    "/",
    requireRoles(UserRole.SALES, UserRole.MANAGER, UserRole.FINANCE),
    (req, res, next) => {
      orderController.list(req, res).catch(next);
    },
  );

  router.get(
    "/:id",
    requireRoles(UserRole.SALES, UserRole.MANAGER, UserRole.FINANCE),
    (req, res, next) => {
      orderController.get(req, res).catch(next);
    },
  );

  router.post("/", requireRoles(UserRole.SALES, UserRole.MANAGER), (req, res, next) => {
    orderController.create(req, res).catch(next);
  });

  router.post("/:id/cancel", requireRoles(UserRole.MANAGER), (req, res, next) => {
    orderController.cancel(req, res).catch(next);
  });

  return router;
}
