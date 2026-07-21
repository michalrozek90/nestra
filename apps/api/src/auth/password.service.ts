import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

const ARGON2_MEMORY_COST_KIB = 19_456;
const ARGON2_TIME_COST = 2;
const ARGON2_PARALLELISM = 1;
// Missing accounts still incur the configured Argon2id cost so login timing does not reveal them.
const NON_EXISTENT_USER_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,p=1,t=2$KXER493QjovhSTgpc13bZg$3QywYRD8xEsvjaaCcRcYoKkMnHYia5YtkHbX9FBxUug';

@Injectable()
export class PasswordService {
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: ARGON2_MEMORY_COST_KIB,
      timeCost: ARGON2_TIME_COST,
      parallelism: ARGON2_PARALLELISM,
    });
  }

  async verifyPassword(password: string, passwordHash: string | null): Promise<boolean> {
    try {
      const isPasswordValid = await argon2.verify(
        passwordHash ?? NON_EXISTENT_USER_PASSWORD_HASH,
        password,
      );

      return passwordHash !== null && isPasswordValid;
    } catch {
      return false;
    }
  }
}
