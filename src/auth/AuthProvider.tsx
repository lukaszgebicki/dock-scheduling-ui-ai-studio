import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { AuthContext, AuthStatus } from './AuthContext';
import { AuthApi, LoginRequest } from '../api/authApi';
import { ApiClient } from '../api/apiClient';
import { assertValidTokenResponse } from './tokenResponse';

export type AuthApiPort = Pick<AuthApi, 'login' | 'refresh' | 'logout'>;

export interface AuthProviderProps {
  children: React.ReactNode;
  authApi?: AuthApiPort;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, authApi }) => {
  const [status, setStatus] = useState<AuthStatus>('bootstrapping');
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const accessTokenRef = useRef<string | null>(null);
  const sessionVersionRef = useRef<number>(0);
  const activeRefreshRef = useRef<Promise<boolean> | null>(null);
  const bootstrapStartedRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const defaultAuthApi = useMemo(() => {
    if (authApi) return authApi;
    const client = new ApiClient({
      getAccessToken: () => accessTokenRef.current,
    });
    return new AuthApi(client);
  }, [authApi]);

  const internalAuthApi = authApi || defaultAuthApi;

  const updateToken = useCallback((token: string | null, newStatus: AuthStatus) => {
    if (!isMountedRef.current) return;
    accessTokenRef.current = token;
    setAccessToken(token);
    setStatus(newStatus);
  }, []);

  const login = useCallback(async (input: LoginRequest): Promise<void> => {
    const nextVersion = sessionVersionRef.current + 1;
    sessionVersionRef.current = nextVersion;

    try {
      const response = await internalAuthApi.login(input);
      assertValidTokenResponse(response);
      if (sessionVersionRef.current === nextVersion) {
        updateToken(response.access_token, 'authenticated');
      }
    } catch (error) {
      if (sessionVersionRef.current === nextVersion) {
        updateToken(null, 'unauthenticated');
      }
      throw error;
    }
  }, [internalAuthApi, updateToken]);

  const refreshSession = useCallback((): Promise<boolean> => {
    if (activeRefreshRef.current) {
      return activeRefreshRef.current;
    }

    const currentVersion = sessionVersionRef.current;

    const doRefresh = async () => {
      try {
        const response = await internalAuthApi.refresh();
        assertValidTokenResponse(response);
        if (sessionVersionRef.current === currentVersion) {
          updateToken(response.access_token, 'authenticated');
        }
        return true;
      } catch {
        if (sessionVersionRef.current === currentVersion) {
          updateToken(null, 'unauthenticated');
        }
        return false;
      } finally {
        if (activeRefreshRef.current === activePromise) {
          activeRefreshRef.current = null;
        }
      }
    };

    const activePromise = doRefresh();
    activeRefreshRef.current = activePromise;
    return activePromise;
  }, [internalAuthApi, updateToken]);

  const logout = useCallback(async (): Promise<void> => {
    sessionVersionRef.current += 1;
    updateToken(null, 'unauthenticated');
    try {
      await internalAuthApi.logout();
    } catch {
      // Ignore logout error
    }
  }, [internalAuthApi, updateToken]);

  useEffect(() => {
    if (!bootstrapStartedRef.current) {
      bootstrapStartedRef.current = true;
      refreshSession();
    }
  }, [refreshSession]);

  const isAuthenticated = status === 'authenticated' && typeof accessToken === 'string' && accessToken.length > 0;

  const value = useMemo(
    () => ({
      accessToken,
      status,
      isAuthenticated,
      login,
      refreshSession,
      logout,
    }),
    [accessToken, status, isAuthenticated, login, refreshSession, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
