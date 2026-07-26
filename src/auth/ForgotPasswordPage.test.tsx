import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { ApiError } from '../api/ApiError';
import {
  ForgotPasswordPage,
  type ForgotPasswordApiPort,
} from './ForgotPasswordPage';

const SUCCESS_MESSAGE = 'If an account exists for this email, password reset instructions have been sent.';

function createControlledPromise<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function setInputValue(element: HTMLInputElement, value: string) {
  fireEvent.change(element, { target: { value } });
}

describe('ForgotPasswordPage', () => {
  let api: Mocked<ForgotPasswordApiPort>;

  beforeEach(() => {
    api = {
      forgotPassword: vi.fn(),
    };
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const renderPage = () => render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <ForgotPasswordPage api={api} />
    </MemoryRouter>,
  );

  const submitForm = (email: string) => {
    setInputValue(screen.getByLabelText('Email') as HTMLInputElement, email);
    fireEvent.click(screen.getByRole('button', { name: 'Send reset instructions' }));
  };

  it('renders the recovery form with accessible controls', () => {
    renderPage();

    expect(screen.getByText('Dock Scheduling')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Forgot password?' })).toBeTruthy();
    expect(screen.getByText('Enter your email address to request password reset instructions.')).toBeTruthy();

    const emailInput = screen.getByLabelText('Email');
    expect(emailInput.getAttribute('type')).toBe('email');
    expect(emailInput.getAttribute('autocomplete')).toBe('email');
    expect(emailInput.getAttribute('inputmode')).toBe('email');
    expect(screen.getByRole('button', { name: 'Send reset instructions' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to sign in' }).getAttribute('href')).toBe('/login');
  });

  it('requires an email address and exposes the validation error through ARIA', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Send reset instructions' }));

    expect(await screen.findByText('Email is required.')).toBeTruthy();
    const emailInput = screen.getByLabelText('Email');
    expect(emailInput.getAttribute('aria-invalid')).toBe('true');
    expect(emailInput.getAttribute('aria-describedby')).toBe('forgot-password-email-error');
    expect(api.forgotPassword).not.toHaveBeenCalled();
  });

  it('rejects an invalid email address', async () => {
    renderPage();

    submitForm('not-an-email');

    expect(await screen.findByText('Enter a valid email address.')).toBeTruthy();
    expect(api.forgotPassword).not.toHaveBeenCalled();
  });

  it('trims and lowercases the email before sending the correct request object', async () => {
    api.forgotPassword.mockResolvedValue(undefined);
    renderPage();

    submitForm('  USER@Example.COM  ');

    await waitFor(() => expect(api.forgotPassword).toHaveBeenCalledTimes(1));
    expect(api.forgotPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
    });
  });

  it('shows only the neutral success message and ignores backend account details', async () => {
    api.forgotPassword.mockResolvedValue({ accountExists: true, message: 'Account exists.' } as never);
    renderPage();

    submitForm('user@example.com');

    expect(await screen.findByRole('status')).toHaveProperty('textContent', SUCCESS_MESSAGE);
    expect(screen.queryByText('Account exists.')).toBeNull();
    expect(screen.queryByText('true')).toBeNull();
  });

  it('disables the submit button while the request is pending', async () => {
    const { promise, resolve } = createControlledPromise<void>();
    api.forgotPassword.mockReturnValue(promise);
    renderPage();

    submitForm('user@example.com');

    const pendingButton = await screen.findByRole('button', { name: 'Sending…' });
    expect(pendingButton).toHaveProperty('disabled', true);
    expect(api.forgotPassword).toHaveBeenCalledTimes(1);

    resolve(undefined);
    expect(await screen.findByText(SUCCESS_MESSAGE)).toBeTruthy();
  });

  it('shows the rate-limit message for HTTP 429', async () => {
    api.forgotPassword.mockRejectedValue(new ApiError({
      status: 429,
      errorCode: 'AUTH_TOO_MANY_REQUESTS',
      message: 'Backend rate-limit details',
    }));
    renderPage();

    submitForm('user@example.com');

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('Too many requests. Try again later.');
    expect(screen.queryByText('Backend rate-limit details')).toBeNull();
  });

  it('shows the network error message without technical details', async () => {
    api.forgotPassword.mockRejectedValue(new ApiError({
      status: 0,
      errorCode: 'NETWORK_ERROR',
      message: 'Failed to fetch at internal adapter',
    }));
    renderPage();

    submitForm('user@example.com');

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('Unable to connect. Check your connection and try again.');
    expect(screen.queryByText('Failed to fetch at internal adapter')).toBeNull();
  });

  it('shows the generic error message for other failures', async () => {
    api.forgotPassword.mockRejectedValue(new Error('Sensitive failure details'));
    renderPage();

    submitForm('user@example.com');

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('Unable to process the request. Try again.');
    expect(screen.queryByText('Sensitive failure details')).toBeNull();
  });

  it('navigates back to /login through the provided link', async () => {
    render(
      <MemoryRouter initialEntries={['/forgot-password']}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPasswordPage api={api} />} />
          <Route path="/login" element={<h1>Login destination</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('link', { name: 'Back to sign in' }));

    expect(await screen.findByRole('heading', { name: 'Login destination' })).toBeTruthy();
  });
});
