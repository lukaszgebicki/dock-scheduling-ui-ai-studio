import { TokenResponse } from '../api/authApi';
import { ApiError } from '../api/ApiError';

export function assertValidTokenResponse(response: unknown): asserts response is TokenResponse {
  if (!response || typeof response !== 'object') {
    throw createInvalidResponseError();
  }

  const data = response as Record<string, unknown>;

  if (typeof data.access_token !== 'string' || data.access_token.length === 0) {
    throw createInvalidResponseError();
  }

  if (typeof data.token_type !== 'string' || data.token_type.toLowerCase() !== 'bearer') {
    throw createInvalidResponseError();
  }

  if (typeof data.expires_in !== 'number' || !Number.isFinite(data.expires_in) || data.expires_in <= 0) {
    throw createInvalidResponseError();
  }
}

function createInvalidResponseError(): ApiError {
  return new ApiError({
    status: 0,
    errorCode: 'AUTH_RESPONSE_INVALID',
    message: 'The authentication response was invalid.',
    details: null,
    correlationId: null,
  });
}
