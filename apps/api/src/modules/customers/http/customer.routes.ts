import { Router } from "express";
import { UserRole } from "@orderflow/contracts";
import { authMiddleware } from "../../auth/http/auth.middleware.js";
import { requireRoles } from "../../auth/http/role.middleware.js";
import { customerController } from "./customer.controller.js";

export function createCustomerRoutes(): Router {
  const router = Router();

  router.use(authMiddleware);
  router.use(requireRoles(UserRole.SALES, UserRole.MANAGER));

  router.get("/", (req, res, next) => {
    customerController.list(req, res).catch(next);
  });

  router.get("/:id", (req, res, next) => {
    customerController.get(req, res).catch(next);
  });

  router.post("/", (req, res, next) => {
    customerController.create(req, res).catch(next);
  });

  router.put("/:id", (req, res, next) => {
    customerController.update(req, res).catch(next);
  });

  return router;
}
