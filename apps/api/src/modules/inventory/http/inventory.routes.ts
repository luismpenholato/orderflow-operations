import { Router } from "express";
import { UserRole } from "@orderflow/contracts";
import { authMiddleware } from "../../auth/http/auth.middleware.js";
import { requireRoles } from "../../auth/http/role.middleware.js";
import { inventoryController } from "./inventory.controller.js";

export function createInventoryRoutes(): Router {
  const router = Router();

  router.use(authMiddleware);
  router.use(requireRoles(UserRole.MANAGER));

  router.get("/", (req, res, next) => {
    inventoryController.list(req, res).catch(next);
  });

  router.get("/:productId", (req, res, next) => {
    inventoryController.get(req, res).catch(next);
  });

  router.post("/:productId/adjustments", (req, res, next) => {
    inventoryController.adjust(req, res).catch(next);
  });

  return router;
}
