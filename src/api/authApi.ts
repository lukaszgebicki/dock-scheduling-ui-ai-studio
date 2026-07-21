import { ApiClient } from './apiClient';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export class AuthApi {
  constructor(private apiClient: ApiClient) {}

  public async login(input: LoginRequest): Promise<TokenResponse> {
    return this.apiClient.post<TokenResponse>('/auth/login', {
      body: input,
    });
  }

  public async refresh(): Promise<TokenResponse> {
    return this.apiClient.post<TokenResponse>('/auth/refresh', {
      headers: {
        'X-CSRF-Intent': '1',
      },
    });
  }

  public async logout(): Promise<void> {
    return this.apiClient.post<void>('/auth/logout', {
      headers: {
        'X-CSRF-Intent': '1',
      },
    });
  }

  public async forgotPassword(input: ForgotPasswordRequest): Promise<void> {
    return this.apiClient.post<void>('/auth/forgot-password', {
      body: input,
    });
  }

  public async resetPassword(input: ResetPasswordRequest): Promise<void> {
    return this.apiClient.post<void>('/auth/reset-password', {
      body: input,
    });
  }
}
