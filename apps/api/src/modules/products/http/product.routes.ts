import { Router } from "express";
import { UserRole } from "@orderflow/contracts";
import { authMiddleware } from "../../auth/http/auth.middleware.js";
import { requireRoles } from "../../auth/http/role.middleware.js";
import { productController } from "./product.controller.js";

export function createProductRoutes(): Router {
  const router = Router();

  router.use(authMiddleware);
  router.use(requireRoles(UserRole.SALES, UserRole.MANAGER));

  router.get("/", (req, res, next) => {
    productController.list(req, res).catch(next);
  });

  router.get("/:id", (req, res, next) => {
    productController.get(req, res).catch(next);
  });

  router.post("/", (req, res, next) => {
    productController.create(req, res).catch(next);
  });

  router.put("/:id", (req, res, next) => {
    productController.update(req, res).catch(next);
  });

  router.post("/:id/components", (req, res, next) => {
    productController.addComponents(req, res).catch(next);
  });

  return router;
}
