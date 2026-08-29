import { NotFoundError, UnauthorizedError } from "../../../shared/errors/app-error.js";
import { UserRepository } from "../infrastructure/user.repository.js";
import type { UserResponse } from "@orderflow/contracts";

export class GetMeUseCase {
  constructor(private readonly userRepo = new UserRepository()) {}

  async execute(userId: string | undefined): Promise<UserResponse> {
    if (!userId) {
      throw new UnauthorizedError();
    }

    const user = await this.userRepo.findById(userId);
    if (!user || !user.active) {
      throw new NotFoundError("User", userId);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
