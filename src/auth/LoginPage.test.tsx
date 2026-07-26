import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { vi, describe, it, expect, beforeEach, afterEach, type Mocked } from 'vitest';
import { LoginPage } from './LoginPage';
import { AuthProvider, AuthApiPort } from './AuthProvider';
import { ApiError } from '../api/ApiError';
import { TokenResponse } from '../api/authApi';

function renderWithRouterAndAuth(
  ui: React.ReactElement,
  authApiMock: AuthApiPort,
  initialEntries: any[] = ['/login']
) {
  return render(
    <AuthProvider authApi={authApiMock}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/login" element={ui} />
          <Route path="/" element={<div>Authenticated application shell</div>} />
          <Route path="/target" element={<div>Target page</div>} />
          <Route path="/target" element={<div>Target page</div>} />
          <Route path="/forgot-password" element={<div>Forgot password placeholder</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}



function setInputValue(element: HTMLInputElement | HTMLElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set;
  if (nativeInputValueSetter) nativeInputValueSetter.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('LoginPage', () => {
  afterEach(() => {
    cleanup();
  });
  let authApiMock: Mocked<AuthApiPort>;

  beforeEach(() => {
    authApiMock = {
      login: vi.fn(),
      refresh: vi.fn().mockRejectedValue(new ApiError({ status: 401, message: 'Unauthorized', errorCode: 'UNAUTHORIZED' })),
      logout: vi.fn(),
    };
  });

  it('renders correctly', async () => {
    renderWithRouterAndAuth(<LoginPage />, authApiMock);

    // Wait for bootstrap to finish
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
    });

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();

    const emailInput = screen.getByLabelText('Email');
    expect(emailInput.getAttribute('type')).toBe('email');
    expect(emailInput.getAttribute('autocomplete')).toBe('username');
    expect(emailInput.getAttribute('inputmode')).toBe('email');

    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput.getAttribute('type')).toBe('password');
    expect(passwordInput.getAttribute('autocomplete')).toBe('current-password');

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toBeTruthy();
  });

  it('shows validation errors for empty fields and does not call login', async () => {
    renderWithRouterAndAuth(<LoginPage />, authApiMock);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
    });

    const submitBtn = screen.getByRole('button', { name: 'Sign in' });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Email is required.')).toBeTruthy();
    expect(await screen.findByText('Password is required.')).toBeTruthy();

    expect(authApiMock.login).not.toHaveBeenCalled();
  });

  it('validates email format', async () => {
    renderWithRouterAndAuth(<LoginPage />, authApiMock);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
    });

    setInputValue(screen.getByLabelText('Email'), 'invalid-email');
    setInputValue(screen.getByLabelText('Password'), 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter a valid email address.')).toBeTruthy();
    expect(authApiMock.login).not.toHaveBeenCalled();
  });

  it('validates password length', async () => {
    renderWithRouterAndAuth(<LoginPage />, authApiMock);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
    });

    const longPassword = 'a'.repeat(129);
    setInputValue(screen.getByLabelText('Password'), longPassword );
    setInputValue(screen.getByLabelText('Email'), 'user@example.com' );
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Password cannot exceed 128 characters.')).toBeTruthy();
    expect(authApiMock.login).not.toHaveBeenCalled();
  });

  it('normalizes email but leaves password untouched', async () => {
    authApiMock.login.mockResolvedValue({ access_token: 'token', token_type: 'bearer', expires_in: 3600 } as TokenResponse);
    renderWithRouterAndAuth(<LoginPage />, authApiMock);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
    });

    setInputValue(screen.getByLabelText('Email'), '  USER@Example.COM  ' );
    setInputValue(screen.getByLabelText('Password'), ' pass word ' );

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(authApiMock.login).toHaveBeenCalledTimes(1);
    });

    expect(authApiMock.login).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: ' pass word '
    });
  });

  it('manages submitting state and prevents double submission', async () => {
    let resolveLogin!: (res: TokenResponse) => void;
    authApiMock.login.mockReturnValue(new Promise(resolve => {
      resolveLogin = resolve;
    }));

    renderWithRouterAndAuth(<LoginPage />, authApiMock);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
    });

    setInputValue(screen.getByLabelText('Email'), 'user@example.com' );
    setInputValue(screen.getByLabelText('Password'), 'password' );

    const submitBtn = screen.getByRole('button', { name: 'Sign in' });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Signing in…')).toBeTruthy();
    expect(submitBtn).toHaveProperty("disabled", true);

    // Try double submit
    fireEvent.click(submitBtn);
    expect(authApiMock.login).toHaveBeenCalledTimes(1);

    resolveLogin({ access_token: 'token', token_type: 'bearer', expires_in: 3600 } as TokenResponse);

    await waitFor(() => {
      expect(screen.getByText('Authenticated application shell')).toBeTruthy();
    });
  });

  it('navigates to / on successful login', async () => {
    authApiMock.login.mockResolvedValue({ access_token: 'token', token_type: 'bearer', expires_in: 3600 } as TokenResponse);
    renderWithRouterAndAuth(<LoginPage />, authApiMock);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
    });

    setInputValue(screen.getByLabelText('Email'), 'user@example.com' );
    setInputValue(screen.getByLabelText('Password'), 'password' );
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Authenticated application shell')).toBeTruthy();
  });

  it('handles AUTH_INVALID_CREDENTIALS error', async () => {
    authApiMock.login.mockRejectedValue(new ApiError({ status: 401, message: 'Invalid', errorCode: 'AUTH_INVALID_CREDENTIALS' }));
    renderWithRouterAndAuth(<LoginPage />, authApiMock);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
    });

    setInputValue(screen.getByLabelText('Email'), 'user@example.com' );
    setInputValue(screen.getByLabelText('Password'), 'password' );
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Incorrect email or password.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in' })).not.toHaveProperty("disabled", true);
  });

  it('handles HTTP 429 error', async () => {
    authApiMock.login.mockRejectedValue(new ApiError({ status: 429, message: 'Too many', errorCode: 'TOO_MANY_REQUESTS' }));
    renderWithRouterAndAuth(<LoginPage />, authApiMock);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
    });

    setInputValue(screen.getByLabelText('Email'), 'user@example.com' );
    setInputValue(screen.getByLabelText('Password'), 'password' );
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Too many sign-in attempts. Try again later.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in' })).not.toHaveProperty("disabled", true);
  });

  it('handles NETWORK_ERROR error', async () => {
    authApiMock.login.mockRejectedValue(new ApiError({ status: 0, message: 'Network', errorCode: 'NETWORK_ERROR' }));
    renderWithRouterAndAuth(<LoginPage />, authApiMock);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
    });

    setInputValue(screen.getByLabelText('Email'), 'user@example.com' );
    setInputValue(screen.getByLabelText('Password'), 'password' );
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Unable to connect. Check your connection and try again.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in' })).not.toHaveProperty("disabled", true);
  });

  it('handles generic ApiError', async () => {
    authApiMock.login.mockRejectedValue(new ApiError({ status: 500, message: 'Server err', errorCode: 'INTERNAL' }));
    renderWithRouterAndAuth(<LoginPage />, authApiMock);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
    });

    setInputValue(screen.getByLabelText('Email'), 'user@example.com' );
    setInputValue(screen.getByLabelText('Password'), 'password' );
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Sign in failed. Try again.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in' })).not.toHaveProperty("disabled", true);
  });

  it('handles non-ApiError', async () => {
    authApiMock.login.mockRejectedValue(new Error('Unknown'));
    renderWithRouterAndAuth(<LoginPage />, authApiMock);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
    });

    setInputValue(screen.getByLabelText('Email'), 'user@example.com' );
    setInputValue(screen.getByLabelText('Password'), 'password' );
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Sign in failed. Try again.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in' })).not.toHaveProperty("disabled", true);
  });

  it('has accessible error messages', async () => {
    authApiMock.login.mockRejectedValue(new ApiError({ status: 500, message: 'Server err', errorCode: 'INTERNAL' }));
    renderWithRouterAndAuth(<LoginPage />, authApiMock);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
    });

    const submitBtn = screen.getByRole('button', { name: 'Sign in' });
    fireEvent.click(submitBtn);

    const emailInput = screen.getByLabelText('Email');
    await waitFor(() => expect(emailInput.getAttribute('aria-invalid')).toBe('true'));
    expect(emailInput.getAttribute('aria-describedby')).toBe('email-error');

    setInputValue(emailInput, 'user@example.com' );
    setInputValue(screen.getByLabelText('Password'), 'password' );
    fireEvent.click(submitBtn);

    const alert = await screen.findByRole('alert');
    expect(alert.getAttribute('aria-live')).toBe('assertive');
    expect(alert.textContent).toContain('Sign in failed. Try again.');
  });

  it('can submit form with Enter key', async () => {
    authApiMock.login.mockResolvedValue({ access_token: 'token', token_type: 'bearer', expires_in: 3600 } as TokenResponse);
    renderWithRouterAndAuth(<LoginPage />, authApiMock);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
    });

    const emailInput = screen.getByLabelText('Email');
    setInputValue(emailInput, 'user@example.com' );
    const passwordInput = screen.getByLabelText('Password');
    setInputValue(passwordInput, 'password' );

    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(authApiMock.login).toHaveBeenCalledTimes(1);
    });
  });

  it('navigates to forgot password', async () => {
    renderWithRouterAndAuth(<LoginPage />, authApiMock);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('link', { name: 'Forgot password?' }));

    expect(await screen.findByText('Forgot password placeholder')).toBeTruthy();
  });

  it('does not leak secure data on screen', async () => {
    authApiMock.login.mockRejectedValue(new ApiError({ status: 401, message: 'Invalid', errorCode: 'AUTH_INVALID_CREDENTIALS' }));
    renderWithRouterAndAuth(<LoginPage />, authApiMock);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
    });

    setInputValue(screen.getByLabelText('Email'), 'user@example.com');
    setInputValue(screen.getByLabelText('Password'), 'super-secret-password');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await screen.findByText('Incorrect email or password.');

    expect(screen.queryByText('super-secret-password')).not.toBeTruthy();
    expect(screen.queryByText('AUTH_INVALID_CREDENTIALS')).not.toBeTruthy();
  });

  it('navigates to safe location.state.from on successful login', async () => {
    authApiMock.login.mockResolvedValue({ access_token: 'token', token_type: 'bearer', expires_in: 3600 } as TokenResponse);
    renderWithRouterAndAuth(<LoginPage />, authApiMock, [{ pathname: '/login', state: { from: '/target' } }]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
    });

    setInputValue(screen.getByLabelText('Email'), 'user@example.com' );
    setInputValue(screen.getByLabelText('Password'), 'password' );
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Target page')).toBeTruthy();
  });

  it('navigates to / when location.state.from is unsafe', async () => {
    authApiMock.login.mockResolvedValue({ access_token: 'token', token_type: 'bearer', expires_in: 3600 } as TokenResponse);
    renderWithRouterAndAuth(<LoginPage />, authApiMock, [{ pathname: '/login', state: { from: '//evil.example' } }]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
    });

    setInputValue(screen.getByLabelText('Email'), 'user@example.com' );
    setInputValue(screen.getByLabelText('Password'), 'password' );
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Authenticated application shell')).toBeTruthy();
  });

  it('navigates to / when location.state.from is /login', async () => {
    authApiMock.login.mockResolvedValue({ access_token: 'token', token_type: 'bearer', expires_in: 3600 } as TokenResponse);
    renderWithRouterAndAuth(<LoginPage />, authApiMock, [{ pathname: '/login', state: { from: '/login' } }]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
    });

    setInputValue(screen.getByLabelText('Email'), 'user@example.com' );
    setInputValue(screen.getByLabelText('Password'), 'password' );
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Authenticated application shell')).toBeTruthy();
  });

  it('navigates to / when location.state.from has query', async () => {
    authApiMock.login.mockResolvedValue({ access_token: 'token', token_type: 'bearer', expires_in: 3600 } as TokenResponse);
    renderWithRouterAndAuth(<LoginPage />, authApiMock, [{ pathname: '/login', state: { from: '/target?evil=1' } }]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
    });

    setInputValue(screen.getByLabelText('Email'), 'user@example.com' );
    setInputValue(screen.getByLabelText('Password'), 'password' );
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Authenticated application shell')).toBeTruthy();
  });

  it('navigates to / when location.state.from has hash', async () => {
    authApiMock.login.mockResolvedValue({ access_token: 'token', token_type: 'bearer', expires_in: 3600 } as TokenResponse);
    renderWithRouterAndAuth(<LoginPage />, authApiMock, [{ pathname: '/login', state: { from: '/target#evil' } }]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
    });

    setInputValue(screen.getByLabelText('Email'), 'user@example.com' );
    setInputValue(screen.getByLabelText('Password'), 'password' );
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Authenticated application shell')).toBeTruthy();
  });

  it('stays on login page if login fails', async () => {
    authApiMock.login.mockRejectedValue(new ApiError({ status: 401, message: 'Invalid', errorCode: 'AUTH_INVALID_CREDENTIALS' }));
    renderWithRouterAndAuth(<LoginPage />, authApiMock, [{ pathname: '/login', state: { from: '/target' } }]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
    });

    setInputValue(screen.getByLabelText('Email'), 'user@example.com' );
    setInputValue(screen.getByLabelText('Password'), 'password' );
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Incorrect email or password.')).toBeTruthy();
  });
});
