// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthenticatedShell } from './AuthenticatedShell';
import { useAuth } from '../auth/useAuth';

vi.mock('../auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('AuthenticatedShell', () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      logout: mockLogout,
      status: 'authenticated',
      isAuthenticated: true,
      error: null,
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('1. logout invokes the existing auth logout function', () => {
    render(
      <MemoryRouter>
        <AuthenticatedShell />
      </MemoryRouter>
    );

    const logoutBtn = screen.getByRole('button', { name: 'Log out' });
    fireEvent.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('2. active navigation exposes aria-current', () => {
    render(
      <MemoryRouter initialEntries={['/users']}>
        <AuthenticatedShell />
      </MemoryRouter>
    );

    const usersLink = screen.getByRole('link', { name: 'Users & access' });
    expect(usersLink.getAttribute('aria-current')).toBe('page');
  });

  it('3. mobile navigation toggle works', () => {
    render(
      <MemoryRouter initialEntries={['/users']}>
        <AuthenticatedShell />
      </MemoryRouter>
    );

    const openMenuBtn = screen.getByRole('button', { name: 'Open menu' });
    fireEvent.click(openMenuBtn);

    const closeMenuBtn = screen.getByRole('button', { name: 'Close menu' });
    expect(closeMenuBtn).toBeDefined();

    fireEvent.click(closeMenuBtn);
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeDefined();
  });
});
