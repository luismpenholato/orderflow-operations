import type { Request, Response } from "express";
import { config } from "../../../config.js";
import { validateBody } from "../../../shared/validation/validate.js";
import { loginRequestSchema } from "@orderflow/contracts";
import { LoginUseCase } from "../application/login.use-case.js";
import { GetMeUseCase } from "../application/get-me.use-case.js";
import { AUTH_COOKIE_NAME } from "../domain/jwt.js";

const loginUseCase = new LoginUseCase();
const getMeUseCase = new GetMeUseCase();

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    const input = validateBody(loginRequestSchema)(req);
    const { user, token } = await loginUseCase.execute(input);

    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000,
    });

    res.json({ user });
  },

  logout(_req: Request, res: Response): void {
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: "lax",
    });
    res.status(204).send();
  },

  async me(req: Request, res: Response): Promise<void> {
    const user = await getMeUseCase.execute(req.user?.id);
    res.json({ user });
  },
};
