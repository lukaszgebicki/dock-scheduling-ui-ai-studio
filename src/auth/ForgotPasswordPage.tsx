import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '../api/ApiError';
import { ApiClient } from '../api/apiClient';
import { AuthApi } from '../api/authApi';
import { AuthLayout } from './AuthLayout';
import {
  forgotPasswordSchema,
  ForgotPasswordFormData,
} from './forgotPasswordSchema';

const SUCCESS_MESSAGE = 'If an account exists for this email, password reset instructions have been sent.';

export type ForgotPasswordApiPort = Pick<AuthApi, 'forgotPassword'>;

interface ForgotPasswordPageProps {
  api?: ForgotPasswordApiPort;
}

export function ForgotPasswordPage({ api }: ForgotPasswordPageProps) {
  const defaultApi = useMemo(() => new AuthApi(new ApiClient()), []);
  const forgotPasswordApi = api ?? defaultApi;
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema as any),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setServerError(null);
    setSuccessMessage(null);

    try {
      await forgotPasswordApi.forgotPassword({ email: data.email });
      setSuccessMessage(SUCCESS_MESSAGE);
    } catch (error: any) {
      if (error instanceof ApiError || error?.name === 'ApiError') {
        if (error.status === 429) {
          setServerError('Too many requests. Try again later.');
        } else if (error.errorCode === 'NETWORK_ERROR') {
          setServerError('Unable to connect. Check your connection and try again.');
        } else {
          setServerError('Unable to process the request. Try again.');
        }
      } else {
        setServerError('Unable to process the request. Try again.');
      }
    }
  };

  return (
    <AuthLayout>
      <div>
        <h1 className="text-center text-3xl font-bold text-[#000A32]">
          Forgot password?
        </h1>
        <p className="mt-3 text-center text-sm leading-6 text-[#023466]">
          Enter your email address to request password reset instructions.
        </p>
      </div>

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="mt-6 rounded-lg border border-[#7FA5D0] bg-[#D9D9C4] p-4 text-sm text-[#000A32]"
        >
          {successMessage}
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

      <form className="mt-7 space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <label htmlFor="forgot-password-email" className="block text-sm font-semibold text-[#000A32]">
            Email
          </label>
          <input
            id="forgot-password-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            disabled={isSubmitting}
            aria-invalid={errors.email ? 'true' : 'false'}
            aria-describedby={errors.email ? 'forgot-password-email-error' : undefined}
            className="mt-2 block w-full rounded-lg border border-[#7FA5D0] px-3 py-2.5 text-[#000A32] shadow-sm outline-none transition focus:border-[#023466] focus:ring-2 focus:ring-[#7FA5D0] disabled:cursor-not-allowed disabled:opacity-60"
            {...register('email')}
          />
          {errors.email && (
            <p id="forgot-password-email-error" className="mt-2 text-sm font-medium text-[#023466]">
              {errors.email.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full justify-center rounded-lg bg-[#000A32] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Sending…' : 'Send reset instructions'}
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
