import { Role } from './user.types.js';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  role: Role;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}
