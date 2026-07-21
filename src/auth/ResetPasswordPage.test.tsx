import React, { StrictMode, useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { ApiError } from '../api/ApiError';
import {
  ResetPasswordPage,
  type ResetPasswordApiPort,
} from './ResetPasswordPage';

const RESET_TOKEN = 'test-reset-token-value';
const VALID_PASSWORD = 'simple phrase';
const INVALID_LINK_MESSAGE = 'This password reset link is invalid or has expired.';
const SUCCESS_MESSAGE = 'Your password has been reset. You can now sign in with your new password.';

function createControlledPromise<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname}{location.search}</div>;
}

function NavigationTypeProbe() {
  const navigationType = useNavigationType();
  return <div data-testid="navigation-type-probe">{navigationType}</div>;
}

function RerenderHarness({ api }: { api: ResetPasswordApiPort }) {
  const [, setRenderCount] = useState(0);
  return (
    <>
      <button type="button" onClick={() => setRenderCount((value) => value + 1)}>
        Rerender page
      </button>
      <ResetPasswordPage api={api} />
    </>
  );
}

describe('ResetPasswordPage', () => {
  let api: Mocked<ResetPasswordApiPort>;

  beforeEach(() => {
    api = {
      resetPassword: vi.fn(),
    };
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  const renderPage = ({
    includeToken = true,
    strictMode = false,
  }: {
    includeToken?: boolean;
    strictMode?: boolean;
  } = {}) => {
    const initialEntry = includeToken
      ? `/reset-password?token=${encodeURIComponent(RESET_TOKEN)}`
      : '/reset-password';
    const router = (
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage api={api} />} />
          <Route path="/login" element={<h1>Login destination</h1>} />
        </Routes>
        <LocationProbe />
        <NavigationTypeProbe />
      </MemoryRouter>
    );

    return render(strictMode ? <StrictMode>{router}</StrictMode> : router);
  };

  const setInputValue = (label: string, value: string) => {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  };

  const submitPasswords = (
    newPassword = VALID_PASSWORD,
    confirmPassword = newPassword,
  ) => {
    setInputValue('New password', newPassword);
    setInputValue('Confirm password', confirmPassword);
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
  };

  it('renders the accessible form when the initial URL contains a token', async () => {
    renderPage();

    expect(screen.getByText('Dock Scheduling')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Reset your password' })).toBeTruthy();
    expect(screen.getByText('Choose a new password for your account.')).toBeTruthy();

    const newPassword = screen.getByLabelText('New password');
    const confirmation = screen.getByLabelText('Confirm password');
    expect(newPassword.getAttribute('type')).toBe('password');
    expect(newPassword.getAttribute('autocomplete')).toBe('new-password');
    expect(confirmation.getAttribute('type')).toBe('password');
    expect(confirmation.getAttribute('autocomplete')).toBe('new-password');
    expect(newPassword).toHaveProperty('disabled', false);
    expect(confirmation).toHaveProperty('disabled', false);
    expect(screen.getByRole('button', { name: 'Reset password' })).toHaveProperty('disabled', false);
  });

  it('reads the token once and sends it only in the API request object', async () => {
    api.resetPassword.mockResolvedValue(undefined);
    renderPage();

    submitPasswords();

    await waitFor(() => expect(api.resetPassword).toHaveBeenCalledTimes(1));
    expect(api.resetPassword).toHaveBeenCalledWith({
      token: RESET_TOKEN,
      new_password: VALID_PASSWORD,
    });
  });

  it('cleans the query string with a replace navigation', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByTestId('navigation-type-probe').textContent).toBe('REPLACE'));
  });

  it('removes the token from the URL immediately after initialization', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByTestId('location-probe').textContent).toBe('/reset-password'));
    expect(screen.getByTestId('location-probe').textContent).not.toContain('token');
  });

  it('never renders the token in the DOM', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(screen.getByTestId('location-probe').textContent).toBe('/reset-password'));
    expect(container.textContent).not.toContain(RESET_TOKEN);
    expect(container.innerHTML).not.toContain(RESET_TOKEN);
  });

  it('does not write the token to localStorage', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    renderPage();

    expect(setItemSpy).not.toHaveBeenCalled();
    expect(Object.values(window.localStorage)).not.toContain(RESET_TOKEN);
  });

  it('does not write the token to sessionStorage', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    renderPage();

    expect(setItemSpy).not.toHaveBeenCalled();
    expect(Object.values(window.sessionStorage)).not.toContain(RESET_TOKEN);
  });

  it('blocks submission and shows the neutral message when the token is missing', () => {
    renderPage({ includeToken: false });

    expect(screen.getByRole('alert').textContent).toBe(INVALID_LINK_MESSAGE);
    expect(screen.getByLabelText('New password')).toHaveProperty('disabled', true);
    expect(screen.getByLabelText('Confirm password')).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Reset password' })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
    expect(api.resetPassword).not.toHaveBeenCalled();
  });

  it('requires a new password and connects the error through ARIA', async () => {
    renderPage();
    setInputValue('Confirm password', VALID_PASSWORD);

    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByText('Password is required.')).toBeTruthy();
    const input = screen.getByLabelText('New password');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('new-password-error');
    expect(api.resetPassword).not.toHaveBeenCalled();
  });

  it('requires at least 12 password characters', async () => {
    renderPage();

    submitPasswords('short value');

    expect(await screen.findByText('Password must contain at least 12 characters.')).toBeTruthy();
    expect(api.resetPassword).not.toHaveBeenCalled();
  });

  it('allows no more than 128 password characters', async () => {
    renderPage();

    submitPasswords('a'.repeat(129));

    expect(await screen.findByText('Password must contain no more than 128 characters.')).toBeTruthy();
    expect(api.resetPassword).not.toHaveBeenCalled();
  });

  it('accepts lowercase text with spaces and preserves password contents exactly', async () => {
    const password = '  lowercase phrase  ';
    api.resetPassword.mockResolvedValue(undefined);
    renderPage();

    submitPasswords(password);

    await waitFor(() => expect(api.resetPassword).toHaveBeenCalledTimes(1));
    expect(api.resetPassword).toHaveBeenCalledWith({
      token: RESET_TOKEN,
      new_password: password,
    });
  });

  it('requires password confirmation', async () => {
    renderPage();
    setInputValue('New password', VALID_PASSWORD);

    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByText('Password confirmation is required.')).toBeTruthy();
    const input = screen.getByLabelText('Confirm password');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('confirm-password-error');
    expect(api.resetPassword).not.toHaveBeenCalled();
  });

  it('rejects different passwords', async () => {
    renderPage();

    submitPasswords(VALID_PASSWORD, 'different phrase');

    expect(await screen.findByText('Passwords do not match.')).toBeTruthy();
    expect(api.resetPassword).not.toHaveBeenCalled();
  });

  it('disables the form while the API request is pending', async () => {
    const { promise, resolve } = createControlledPromise<void>();
    api.resetPassword.mockReturnValue(promise);
    renderPage();

    submitPasswords();

    const button = await screen.findByRole('button', { name: 'Resetting password…' });
    expect(button).toHaveProperty('disabled', true);
    expect(screen.getByLabelText('New password')).toHaveProperty('disabled', true);
    expect(screen.getByLabelText('Confirm password')).toHaveProperty('disabled', true);

    resolve(undefined);
    expect(await screen.findByRole('status')).toHaveProperty('textContent', SUCCESS_MESSAGE);
  });

  it('clears and permanently disables the form after HTTP 204 success', async () => {
    api.resetPassword.mockResolvedValue(undefined);
    renderPage();

    submitPasswords();

    expect(await screen.findByRole('status')).toHaveProperty('textContent', SUCCESS_MESSAGE);
    expect(screen.getByLabelText('New password')).toHaveProperty('value', '');
    expect(screen.getByLabelText('Confirm password')).toHaveProperty('value', '');
    expect(screen.getByRole('button', { name: 'Reset password' })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
    expect(api.resetPassword).toHaveBeenCalledTimes(1);
  });

  it('does not log in or navigate automatically after success', async () => {
    api.resetPassword.mockResolvedValue(undefined);
    renderPage();

    submitPasswords();

    await screen.findByRole('status');
    expect(screen.getByTestId('location-probe').textContent).toBe('/reset-password');
    expect(screen.getByRole('link', { name: 'Back to sign in' }).getAttribute('href')).toBe('/login');
  });

  it('shows one terminal neutral error for HTTP 401 and blocks retries', async () => {
    api.resetPassword.mockRejectedValue(new ApiError({
      status: 401,
      errorCode: 'HTTP_ERROR',
      message: 'Backend says the token expired',
    }));
    renderPage();

    submitPasswords();

    expect(await screen.findByRole('alert')).toHaveProperty('textContent', INVALID_LINK_MESSAGE);
    expect(screen.queryByText('Backend says the token expired')).toBeNull();
    expect(screen.getByRole('button', { name: 'Reset password' })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
    expect(api.resetPassword).toHaveBeenCalledTimes(1);
  });

  it('shows one terminal neutral error for the invalid-token error code', async () => {
    api.resetPassword.mockRejectedValue(new ApiError({
      status: 400,
      errorCode: 'AUTH_PASSWORD_RESET_TOKEN_INVALID',
      message: 'Backend token detail',
    }));
    renderPage();

    submitPasswords();

    expect(await screen.findByRole('alert')).toHaveProperty('textContent', INVALID_LINK_MESSAGE);
    expect(screen.queryByText('Backend token detail')).toBeNull();
    expect(screen.getByRole('button', { name: 'Reset password' })).toHaveProperty('disabled', true);
  });

  it.each([
    'expired',
    'used',
    'revoked',
  ])('does not distinguish the %s token condition', async (condition) => {
    api.resetPassword.mockRejectedValue(new ApiError({
      status: 401,
      errorCode: 'AUTH_PASSWORD_RESET_TOKEN_INVALID',
      message: `Backend condition: ${condition}`,
    }));
    renderPage();

    submitPasswords();

    expect(await screen.findByRole('alert')).toHaveProperty('textContent', INVALID_LINK_MESSAGE);
    expect(screen.queryByText(`Backend condition: ${condition}`)).toBeNull();
  });

  it('shows the rate-limit message for HTTP 429', async () => {
    api.resetPassword.mockRejectedValue(new ApiError({
      status: 429,
      errorCode: 'AUTH_TOO_MANY_REQUESTS',
      message: 'Backend rate-limit detail',
    }));
    renderPage();

    submitPasswords();

    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Too many requests. Try again later.');
    expect(screen.queryByText('Backend rate-limit detail')).toBeNull();
    expect(screen.getByRole('button', { name: 'Reset password' })).toHaveProperty('disabled', false);
  });

  it('shows the network error without technical details', async () => {
    api.resetPassword.mockRejectedValue(new ApiError({
      status: 0,
      errorCode: 'NETWORK_ERROR',
      message: 'Failed to fetch internally',
    }));
    renderPage();

    submitPasswords();

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Unable to connect. Check your connection and try again.',
    );
    expect(screen.queryByText('Failed to fetch internally')).toBeNull();
  });

  it('shows the generic error without raw response metadata', async () => {
    api.resetPassword.mockRejectedValue(new ApiError({
      status: 500,
      errorCode: 'INTERNAL_ERROR',
      message: 'Raw backend message',
      details: { internal: 'Sensitive details' },
      correlationId: 'private-correlation-id',
    }));
    renderPage();

    submitPasswords();

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Unable to reset the password. Try again.',
    );
    expect(document.body.textContent).not.toContain('Raw backend message');
    expect(document.body.textContent).not.toContain('Sensitive details');
    expect(document.body.textContent).not.toContain('private-correlation-id');
  });

  it('navigates to /login only when the user follows the sign-in link', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('link', { name: 'Back to sign in' }));

    expect(await screen.findByRole('heading', { name: 'Login destination' })).toBeTruthy();
  });

  it('preserves the captured token through StrictMode effects and a parent rerender', async () => {
    api.resetPassword.mockResolvedValue(undefined);
    render(
      <StrictMode>
        <MemoryRouter initialEntries={[`/reset-password?token=${encodeURIComponent(RESET_TOKEN)}`]}>
          <RerenderHarness api={api} />
          <LocationProbe />
        </MemoryRouter>
      </StrictMode>,
    );

    await waitFor(() => expect(screen.getByTestId('location-probe').textContent).toBe('/reset-password'));
    fireEvent.click(screen.getByRole('button', { name: 'Rerender page' }));
    submitPasswords();

    await waitFor(() => expect(api.resetPassword).toHaveBeenCalledTimes(1));
    expect(api.resetPassword).toHaveBeenCalledWith({
      token: RESET_TOKEN,
      new_password: VALID_PASSWORD,
    });
  });
});
