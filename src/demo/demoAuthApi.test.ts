import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/ApiError';
import { DemoAuthApi } from './demoAuthApi';

const VALID_EMAIL = 'demo@dock.local';
const VALID_PASSWORD = 'DemoPassword123!';
const TOKEN_RESPONSE = {
  access_token: 'demo-access-token',
  token_type: 'Bearer',
  expires_in: 3600,
};

describe('DemoAuthApi', () => {
  let authApi: DemoAuthApi;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    authApi = new DemoAuthApi();
  });

  afterEach(() => {
    expect(fetchMock).not.toHaveBeenCalled();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function expectInvalidCredentials(loginPromise: Promise<unknown>) {
    const error = await loginPromise.catch((reason) => reason);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 401,
      errorCode: 'AUTH_INVALID_CREDENTIALS',
    });
  }

  it('logs in with the demo credentials and returns the expected token response', async () => {
    await expect(authApi.login({ email: VALID_EMAIL, password: VALID_PASSWORD })).resolves.toEqual(
      TOKEN_RESPONSE,
    );
  });

  it('rejects an invalid email paired with the valid password', async () => {
    await expectInvalidCredentials(
      authApi.login({ email: 'wrong@dock.local', password: VALID_PASSWORD }),
    );
  });

  it('rejects the valid email paired with an invalid password', async () => {
    await expectInvalidCredentials(
      authApi.login({ email: VALID_EMAIL, password: 'WrongPassword123!' }),
    );
  });

  it('rejects completely invalid login credentials', async () => {
    await expectInvalidCredentials(
      authApi.login({ email: 'wrong@example.com', password: 'WrongPassword123!' }),
    );
  });

  it('rejects refresh before login and remains unauthenticated', async () => {
    await expect(authApi.refresh()).rejects.toMatchObject({
      status: 401,
      errorCode: 'UNAUTHENTICATED',
    });
    await expect(authApi.refresh()).rejects.toMatchObject({
      status: 401,
      errorCode: 'UNAUTHENTICATED',
    });
  });

  it('refreshes the in-memory session after a successful login', async () => {
    await authApi.login({ email: VALID_EMAIL, password: VALID_PASSWORD });

    await expect(authApi.refresh()).resolves.toEqual(TOKEN_RESPONSE);
  });

  it('logs out successfully and rejects the next refresh', async () => {
    await authApi.login({ email: VALID_EMAIL, password: VALID_PASSWORD });

    await expect(authApi.logout()).resolves.toBeUndefined();
    await expect(authApi.refresh()).rejects.toMatchObject({
      status: 401,
      errorCode: 'UNAUTHENTICATED',
    });
  });

  it('completes forgot password for a correctly formatted email', async () => {
    await expect(authApi.forgotPassword({ email: 'person@example.com' })).resolves.toBeUndefined();
  });

  it('resets the password with the valid demo token', async () => {
    await expect(
      authApi.resetPassword({
        token: 'valid-demo-token',
        new_password: 'NewDemoPassword123!',
      }),
    ).resolves.toBeUndefined();
  });

  it('rejects password reset with any other token', async () => {
    const error = await authApi
      .resetPassword({
        token: 'invalid-demo-token',
        new_password: 'NewDemoPassword123!',
      })
      .catch((reason) => reason);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 401,
      errorCode: 'AUTH_PASSWORD_RESET_TOKEN_INVALID',
    });
  });
});
