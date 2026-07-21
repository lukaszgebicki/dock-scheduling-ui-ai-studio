import { LoginRequest, TokenResponse, ForgotPasswordRequest, ResetPasswordRequest, AuthApi } from '../api/authApi';
import { ApiError } from '../api/ApiError';
import { ApiClient } from '../api/apiClient';

export class DemoAuthApi extends AuthApi {
  private isLoggedIn: boolean = false;

  constructor() {
    // Pass a dummy client, we will override all methods anyway.
    super(new ApiClient());
  }

  public async login(input: LoginRequest): Promise<TokenResponse> {
    if (input.email === 'demo@dock.local' && input.password === 'DemoPassword123!') {
      this.isLoggedIn = true;
      return {
        access_token: 'demo-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };
    }

    throw new ApiError({
      status: 401,
      errorCode: 'AUTH_INVALID_CREDENTIALS',
      message: 'Invalid credentials',
    });
  }

  public async refresh(): Promise<TokenResponse> {
    if (this.isLoggedIn) {
      return {
        access_token: 'demo-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };
    }

    throw new ApiError({
      status: 401,
      errorCode: 'UNAUTHENTICATED',
      message: 'Unauthenticated',
    });
  }

  public async logout(): Promise<void> {
    this.isLoggedIn = false;
    return Promise.resolve();
  }

  public async forgotPassword(_input: ForgotPasswordRequest): Promise<void> {
    return Promise.resolve();
  }

  public async resetPassword(input: ResetPasswordRequest): Promise<void> {
    if (input.token === 'valid-demo-token') {
      return Promise.resolve();
    }

    throw new ApiError({
      status: 401,
      errorCode: 'AUTH_PASSWORD_RESET_TOKEN_INVALID',
      message: 'Invalid token',
    });
  }
}

export const demoAuthApi = new DemoAuthApi();
