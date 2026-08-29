import bcrypt from "bcryptjs";
import { UnauthorizedError } from "../../../shared/errors/app-error.js";
import { UserRepository } from "../infrastructure/user.repository.js";
import { signToken, type JwtPayload } from "../domain/jwt.js";
import type { LoginRequest, UserResponse } from "@orderflow/contracts";

export class LoginUseCase {
  constructor(private readonly userRepo = new UserRepository()) {}

  async execute(input: LoginRequest): Promise<{ user: UserResponse; token: string }> {
    const user = await this.userRepo.findByEmail(input.email);

    if (!user || !user.active) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token: signToken(payload),
    };
  }
}
