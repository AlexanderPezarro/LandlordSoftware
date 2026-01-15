import bcrypt from 'bcrypt';
import prisma from '../db/client.js';
import { User } from '../../../shared/types/auth.types.js';
import { SALT_ROUNDS } from '../config/constants.js';

export class AuthService {
  async createUser(email: string, password: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    return {
      id: user.id,
      email: user.email,
    };
  }

  async validateCredentials(email: string, password: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
    };
  }
}

export default new AuthService();
