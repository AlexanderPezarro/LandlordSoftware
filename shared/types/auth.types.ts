export interface LoginRequest {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'LANDLORD' | 'VIEWER';
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
