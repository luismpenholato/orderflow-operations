import type { Request, Response } from "express";
import { z } from "zod";
import {
  addKitComponentsSchema,
  createProductSchema,
  productListQuerySchema,
  updateProductSchema,
} from "@orderflow/contracts";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../../shared/validation/validate.js";
import { ListProductsUseCase } from "../application/list-products.use-case.js";
import { GetProductUseCase } from "../application/get-product.use-case.js";
import { CreateProductUseCase } from "../application/create-product.use-case.js";
import { UpdateProductUseCase } from "../application/update-product.use-case.js";
import { AddKitComponentsUseCase } from "../application/add-kit-components.use-case.js";

const idParamsSchema = z.object({ id: z.string().uuid() });

const listUseCase = new ListProductsUseCase();
const getUseCase = new GetProductUseCase();
const createUseCase = new CreateProductUseCase();
const updateUseCase = new UpdateProductUseCase();
const addComponentsUseCase = new AddKitComponentsUseCase();

export const productController = {
  async list(req: Request, res: Response): Promise<void> {
    const query = validateQuery(productListQuerySchema)(req);
    const result = await listUseCase.execute(query);
    res.json(result);
  },

  async get(req: Request, res: Response): Promise<void> {
    const { id } = validateParams(idParamsSchema)(req);
    const product = await getUseCase.execute(id);
    res.json(product);
  },

  async create(req: Request, res: Response): Promise<void> {
    const input = validateBody(createProductSchema)(req);
    const product = await createUseCase.execute(input);
    res.status(201).json(product);
  },

  async update(req: Request, res: Response): Promise<void> {
    const { id } = validateParams(idParamsSchema)(req);
    const input = validateBody(updateProductSchema)(req);
    const product = await updateUseCase.execute(id, input);
    res.json(product);
  },

  async addComponents(req: Request, res: Response): Promise<void> {
    const { id } = validateParams(idParamsSchema)(req);
    const input = validateBody(addKitComponentsSchema)(req);
    const product = await addComponentsUseCase.execute(id, input);
    res.json(product);
  },
};
