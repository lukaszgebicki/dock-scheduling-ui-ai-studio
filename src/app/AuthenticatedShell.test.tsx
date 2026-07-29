// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthenticatedShell as Shell } from './AuthenticatedShell';
import { useAuth } from '../auth/useAuth';
import { DemoDomainProvider } from '../demoDomain/DemoDomainProvider';

function AuthenticatedShell() {
  return (
    <DemoDomainProvider>
      <Shell />
    </DemoDomainProvider>
  );
}

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
    cleanup();
    vi.restoreAllMocks();
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

  it('4. Supplier organizations link has exact href and is active on the overview route while Users and Warehouses are not active', () => {
    render(
      <MemoryRouter initialEntries={['/supplier-organizations']}>
        <AuthenticatedShell />
      </MemoryRouter>
    );

    const primaryNav = screen.getByRole('navigation', { name: 'Primary navigation' });
    const supplierLink = within(primaryNav).getByRole('link', { name: 'Supplier organizations' });
    const usersLink = within(primaryNav).getByRole('link', { name: 'Users & access' });
    const warehousesLink = within(primaryNav).getByRole('link', { name: 'Warehouses' });

    expect(supplierLink.getAttribute('href')).toBe('/supplier-organizations');
    expect(supplierLink.getAttribute('aria-current')).toBe('page');
    expect(usersLink.getAttribute('aria-current')).toBeNull();
    expect(warehousesLink.getAttribute('aria-current')).toBeNull();

    const supplierLinkIcon = supplierLink.querySelector('svg');
    if (!supplierLinkIcon) {
      throw new Error('Expected the Supplier organizations link to contain a decorative icon.');
    }
    expect(supplierLinkIcon.getAttribute('aria-hidden')).toBe('true');
    expect(supplierLink.textContent).toBe('Supplier organizations');
  });

  it('5. Supplier organizations remains active on the add route and the breadcrumb contains the overview link plus current Add supplier organization item', () => {
    render(
      <MemoryRouter initialEntries={['/supplier-organizations/new']}>
        <AuthenticatedShell />
      </MemoryRouter>
    );

    const primaryNav = screen.getByRole('navigation', { name: 'Primary navigation' });
    const supplierLink = within(primaryNav).getByRole('link', { name: 'Supplier organizations' });
    expect(supplierLink.getAttribute('aria-current')).toBe('page');

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const overviewLink = within(breadcrumb).getByRole('link', { name: 'Supplier organizations' });
    expect(overviewLink.getAttribute('href')).toBe('/supplier-organizations');
    expect(within(breadcrumb).getByText('Add supplier organization').textContent).toBe('Add supplier organization');
  });

  it('6. selecting Supplier organizations from an open mobile menu closes the menu', () => {
    render(
      <MemoryRouter initialEntries={['/users']}>
        <AuthenticatedShell />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByRole('button', { name: 'Close menu' }).getAttribute('aria-label')).toBe('Close menu');

    const primaryNav = screen.getByRole('navigation', { name: 'Primary navigation' });
    const supplierLink = within(primaryNav).getByRole('link', { name: 'Supplier organizations' });
    fireEvent.click(supplierLink);

    expect(screen.getByRole('button', { name: 'Open menu' }).getAttribute('aria-label')).toBe('Open menu');
  });

  it('7. unavailable navigation items expose disabled link semantics while remaining non-navigable', () => {
    render(
      <MemoryRouter initialEntries={['/users']}>
        <AuthenticatedShell />
      </MemoryRouter>
    );

    const primaryNav = screen.getByRole('navigation', { name: 'Primary navigation' });
    const dashboard = within(primaryNav).getByRole('link', { name: /Dashboard\s*Soon/i });
    const slotCalendar = within(primaryNav).getByRole('link', { name: /Slot calendar\s*Soon/i });

    for (const item of [dashboard, slotCalendar]) {
      expect(item.getAttribute('aria-disabled')).toBe('true');
      expect(item.tagName).toBe('DIV');
      expect(item.getAttribute('href')).toBeNull();
    }
  });

  it('8. Appointments is a navigable active item with a Scheduling breadcrumb', () => {
    render(
      <MemoryRouter initialEntries={['/appointments']}>
        <AuthenticatedShell />
      </MemoryRouter>
    );

    const primaryNav = screen.getByRole('navigation', { name: 'Primary navigation' });
    const appointmentsLink = within(primaryNav).getByRole('link', { name: 'Appointments' });
    expect(appointmentsLink.getAttribute('href')).toBe('/appointments');
    expect(appointmentsLink.getAttribute('aria-current')).toBe('page');
    expect(appointmentsLink.getAttribute('aria-disabled')).toBeNull();

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByText('Scheduling').textContent).toBe('Scheduling');
    expect(within(breadcrumb).getByText('Appointments').textContent).toBe('Appointments');
  });

  it('9. exposes six explicit demo role contexts and explains their UI-only effect', () => {
    render(
      <MemoryRouter initialEntries={['/users']}>
        <AuthenticatedShell />
      </MemoryRouter>
    );

    const selector = screen.getByLabelText('Demo access context');
    expect(within(selector).getAllByRole('option')).toHaveLength(6);
    expect(selector.getAttribute('aria-describedby')).toBe('demo-role-context-help');
    expect(screen.getByText(/does not change authentication or authorization/i).textContent)
      .toBe('UI-only demonstration. This does not change authentication or authorization.');
  });

  it('10. changes visible navigation to the selected role matrix', () => {
    render(
      <MemoryRouter initialEntries={['/appointments']}>
        <AuthenticatedShell />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Demo access context'), {
      target: { value: 'supplier-user' },
    });

    expect(screen.getByRole('link', { name: 'Appointments' }).getAttribute('href'))
      .toBe('/appointments');
    expect(screen.queryByText('Administration')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Users & access' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Warehouses' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Supplier organizations' })).toBeNull();
  });
});
