import type { QueryClient } from "../../../shared/database/pool.js";
import { pool } from "../../../shared/database/pool.js";
import type { UserRole } from "@orderflow/contracts";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  active: boolean;
}

export class UserRepository {
  async findByEmail(email: string, client: QueryClient = pool): Promise<UserRecord | null> {
    const { rows } = await client.query<UserRecord>(
      `SELECT id, email, password_hash AS "passwordHash", name, role, active
       FROM users WHERE email = $1`,
      [email],
    );
    return rows[0] ?? null;
  }

  async findById(id: string, client: QueryClient = pool): Promise<UserRecord | null> {
    const { rows } = await client.query<UserRecord>(
      `SELECT id, email, password_hash AS "passwordHash", name, role, active
       FROM users WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }
}
