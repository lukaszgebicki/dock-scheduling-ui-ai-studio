import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '../api/ApiError';
import { ApiClient } from '../api/apiClient';
import { AuthApi } from '../api/authApi';
import { AuthLayout } from './AuthLayout';
import {
  resetPasswordSchema,
  ResetPasswordFormData,
} from './resetPasswordSchema';

const INVALID_LINK_MESSAGE = 'This password reset link is invalid or has expired.';
const SUCCESS_MESSAGE = 'Your password has been reset. You can now sign in with your new password.';

export type ResetPasswordApiPort = Pick<AuthApi, 'resetPassword'>;

interface ResetPasswordPageProps {
  api?: ResetPasswordApiPort;
}

export function ResetPasswordPage({ api }: ResetPasswordPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const urlCleanedRef = useRef(false);
  const [resetToken, setResetToken] = useState<string | null>(() => {
    const token = new URLSearchParams(location.search).get('token');
    return token || null;
  });
  const [serverError, setServerError] = useState<string | null>(() => (
    resetToken ? null : INVALID_LINK_MESSAGE
  ));
  const [isTerminal, setIsTerminal] = useState(() => !resetToken);
  const [isComplete, setIsComplete] = useState(false);
  const defaultApi = useMemo(() => new AuthApi(new ApiClient()), []);
  const resetPasswordApi = api ?? defaultApi;

  useEffect(() => {
    if (urlCleanedRef.current) {
      return;
    }

    urlCleanedRef.current = true;
    if (location.search) {
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema as any),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const isBlocked = !resetToken || isTerminal || isComplete;

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!resetToken || isTerminal || isComplete) {
      return;
    }

    setServerError(null);

    try {
      await resetPasswordApi.resetPassword({
        token: resetToken,
        new_password: data.newPassword,
      });
      reset({ newPassword: '', confirmPassword: '' });
      setResetToken(null);
      setIsComplete(true);
    } catch (error: any) {
      if (error instanceof ApiError || error?.name === 'ApiError') {
        if (error.status === 401 || error.errorCode === 'AUTH_PASSWORD_RESET_TOKEN_INVALID') {
          reset({ newPassword: '', confirmPassword: '' });
          setResetToken(null);
          setIsTerminal(true);
          setServerError(INVALID_LINK_MESSAGE);
        } else if (error.status === 429) {
          setServerError('Too many requests. Try again later.');
        } else if (error.errorCode === 'NETWORK_ERROR') {
          setServerError('Unable to connect. Check your connection and try again.');
        } else {
          setServerError('Unable to reset the password. Try again.');
        }
      } else {
        setServerError('Unable to reset the password. Try again.');
      }
    }
  };

  return (
    <AuthLayout>
      <div>
        <h1 className="text-center text-3xl font-bold text-[#000A32]">
          Reset your password
        </h1>
        <p className="mt-3 text-center text-sm leading-6 text-[#023466]">
          Choose a new password for your account.
        </p>
      </div>

      {isComplete && (
        <div
          role="status"
          aria-live="polite"
          className="mt-6 rounded-lg border border-[#7FA5D0] bg-[#D9D9C4] p-4 text-sm text-[#000A32]"
        >
          {SUCCESS_MESSAGE}
        </div>
      )}

      {serverError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-6 rounded-lg border border-[#FF9166] bg-[#FF9166] p-4 text-sm font-medium text-[#000A32]"
        >
          {serverError}
        </div>
      )}

      <form className="mt-7 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <label htmlFor="new-password" className="block text-sm font-semibold text-[#000A32]">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            disabled={isSubmitting || isBlocked}
            aria-invalid={errors.newPassword ? 'true' : 'false'}
            aria-describedby={errors.newPassword ? 'new-password-error' : undefined}
            className="mt-2 block w-full rounded-lg border border-[#7FA5D0] px-3 py-2.5 text-[#000A32] shadow-sm outline-none transition focus:border-[#023466] focus:ring-2 focus:ring-[#7FA5D0] disabled:cursor-not-allowed disabled:opacity-60"
            {...register('newPassword')}
          />
          {errors.newPassword && (
            <p id="new-password-error" className="mt-2 text-sm font-medium text-[#023466]">
              {errors.newPassword.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-semibold text-[#000A32]">
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            disabled={isSubmitting || isBlocked}
            aria-invalid={errors.confirmPassword ? 'true' : 'false'}
            aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
            className="mt-2 block w-full rounded-lg border border-[#7FA5D0] px-3 py-2.5 text-[#000A32] shadow-sm outline-none transition focus:border-[#023466] focus:ring-2 focus:ring-[#7FA5D0] disabled:cursor-not-allowed disabled:opacity-60"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p id="confirm-password-error" className="mt-2 text-sm font-medium text-[#023466]">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isBlocked}
          className="flex w-full justify-center rounded-lg bg-[#000A32] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Resetting password…' : 'Reset password'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm">
        <Link
          to="/login"
          className="font-semibold text-[#023466] underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]"
        >
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
