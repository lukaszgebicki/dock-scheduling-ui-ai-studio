import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormData } from './loginSchema';
import { useAuth } from './useAuth';
import { ApiError } from '../api/ApiError';
import { getSafePostLoginPath } from './postLoginRedirect';
import { AuthLayout } from './AuthLayout';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema as any),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      await login({ email: data.email, password: data.password });
      const targetPath = getSafePostLoginPath(location.state);
      navigate(targetPath, { replace: true });
    } catch (err: any) {
      if (err instanceof ApiError || err?.name === 'ApiError') {
        if (err.errorCode === 'AUTH_INVALID_CREDENTIALS') {
          setServerError('Incorrect email or password.');
        } else if (err.status === 429) {
          setServerError('Too many sign-in attempts. Try again later.');
        } else if (err.errorCode === 'NETWORK_ERROR') {
          setServerError('Unable to connect. Check your connection and try again.');
        } else {
          setServerError('Sign in failed. Try again.');
        }
      } else {
        setServerError('Sign in failed. Try again.');
      }
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-[#000A32]">Sign in</h2>
          <p className="mt-2 text-center text-sm text-[#023466]">
            Sign in to access your account
          </p>
        </div>

        {serverError && (
          <div role="alert" aria-live="assertive" className="rounded-lg border border-[#FF9166] bg-[#FF9166] p-4 text-sm font-medium text-[#000A32]">
            {serverError}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#000A32]">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                disabled={isSubmitting}
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className="mt-1 block w-full rounded-md border border-[#7FA5D0] px-3 py-2 text-[#000A32] shadow-sm focus:border-[#023466] focus:outline-none focus:ring-[#7FA5D0] sm:text-sm disabled:opacity-50"
                {...register('email')}
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm text-[#023466]">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#000A32]">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                disabled={isSubmitting}
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : undefined}
                className="mt-1 block w-full rounded-md border border-[#7FA5D0] px-3 py-2 text-[#000A32] shadow-sm focus:border-[#023466] focus:outline-none focus:ring-[#7FA5D0] sm:text-sm disabled:opacity-50"
                {...register('password')}
              />
              {errors.password && (
                <p id="password-error" className="mt-1 text-sm text-[#023466]">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link to="/forgot-password" className="font-medium text-[#023466] underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
                Forgot password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full justify-center rounded-md border border-transparent bg-[#000A32] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0] focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
