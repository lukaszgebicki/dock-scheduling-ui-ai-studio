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

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('2. active navigation exposes aria-current', () => {
    render(
      <MemoryRouter initialEntries={['/users']}>
        <AuthenticatedShell />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Users & access' })
      .getAttribute('aria-current')).toBe('page');
  });

  it('3. mobile navigation toggle exposes state, controlled navigation and overlay close', () => {
    render(
      <MemoryRouter initialEntries={['/users']}>
        <AuthenticatedShell />
      </MemoryRouter>
    );

    const openMenu = screen.getByRole('button', { name: 'Open menu' });
    expect(openMenu.getAttribute('aria-expanded')).toBe('false');
    expect(openMenu.getAttribute('aria-controls')).toBe('primary-navigation');
    expect(openMenu.className).toContain('min-h-11');
    fireEvent.click(openMenu);

    const closeMenu = screen.getByRole('button', { name: 'Close menu' });
    expect(closeMenu.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Close navigation overlay' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Close navigation overlay' }));
    expect(screen.getByRole('button', { name: 'Open menu' })
      .getAttribute('aria-expanded')).toBe('false');
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
    if (!supplierLinkIcon) throw new Error('Expected decorative Supplier icon.');
    expect(supplierLinkIcon.getAttribute('aria-hidden')).toBe('true');
    expect(supplierLink.textContent).toBe('Supplier organizations');
  });

  it('5. Supplier organizations remains active on add route and breadcrumb links back', () => {
    render(
      <MemoryRouter initialEntries={['/supplier-organizations/new']}>
        <AuthenticatedShell />
      </MemoryRouter>
    );

    const primaryNav = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(primaryNav).getByRole('link', { name: 'Supplier organizations' })
      .getAttribute('aria-current')).toBe('page');

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByRole('link', { name: 'Supplier organizations' })
      .getAttribute('href')).toBe('/supplier-organizations');
    expect(within(breadcrumb).getByText('Add supplier organization').textContent)
      .toBe('Add supplier organization');
  });

  it('6. selecting a route from an open mobile menu closes the menu after navigation', () => {
    render(
      <MemoryRouter initialEntries={['/users']}>
        <AuthenticatedShell />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const primaryNav = screen.getByRole('navigation', { name: 'Primary navigation' });
    fireEvent.click(within(primaryNav).getByRole('link', { name: 'Slot calendar' }));

    expect(screen.getByRole('button', { name: 'Open menu' })
      .getAttribute('aria-expanded')).toBe('false');
    expect(within(primaryNav).getByRole('link', { name: 'Slot calendar' })
      .getAttribute('aria-current')).toBe('page');
  });

  it('7. implemented overview and scheduling items are touch-safe navigable links', () => {
    render(
      <MemoryRouter initialEntries={['/users']}>
        <AuthenticatedShell />
      </MemoryRouter>
    );

    const primaryNav = screen.getByRole('navigation', { name: 'Primary navigation' });
    const expected = [
      ['Dashboard', '/dashboard'],
      ['Notifications', '/notifications'],
      ['Appointments', '/appointments'],
      ['Slot calendar', '/calendar'],
    ] as const;

    for (const [name, href] of expected) {
      const item = within(primaryNav).getByRole('link', { name });
      expect(item.tagName).toBe('A');
      expect(item.getAttribute('href')).toBe(href);
      expect(item.getAttribute('aria-disabled')).toBeNull();
      expect(item.className).toContain('min-h-11');
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
    expect(selector.className).toContain('min-h-11');
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

  it('11. complex warehouse configuration shows responsive desktop guidance without hiding the route', () => {
    render(
      <MemoryRouter initialEntries={['/warehouses/nowy-kisielin-distribution-center/configuration']}>
        <AuthenticatedShell />
      </MemoryRouter>
    );

    const notice = screen.getByRole('complementary', { name: 'Desktop recommendation' });
    expect(notice.textContent).toContain('Desktop recommended for complex configuration');
    expect(notice.textContent).toContain('Basic review and actions remain available');
    expect(screen.getByText('Warehouse configuration')).toBeDefined();
  });
});
