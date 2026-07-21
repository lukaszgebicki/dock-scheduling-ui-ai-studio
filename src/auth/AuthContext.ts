import { createContext } from 'react';
import { LoginRequest } from '../api/authApi';

export type AuthStatus = 'bootstrapping' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  accessToken: string | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  login(input: LoginRequest): Promise<void>;
  refreshSession(): Promise<boolean>;
  logout(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
