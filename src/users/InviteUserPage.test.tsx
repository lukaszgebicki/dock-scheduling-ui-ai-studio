// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { InviteUserPage } from './InviteUserPage';
import { UsersAccessPage } from './UsersAccessPage';
import { AuthenticatedShell } from '../app/AuthenticatedShell';
import { AuthProvider } from '../auth/AuthProvider';
import { AuthContext, AuthContextValue } from '../auth/AuthContext';
import { demoAuthApi } from '../demo/demoAuthApi';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { demoUsers } from './demoUsers';
import {
  demoSupplierAssignments,
  getSupplierWarehouseDisplayNames,
} from './demoAccessScope';

describe('InviteUserPage Implementation', () => {
  beforeEach(() => {
    // Reset mocks before each test.
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderWithRouter = (initialRoute = '/users/invite') => {
    const authContextValue: AuthContextValue = {
      status: 'authenticated',
      isAuthenticated: true,
      accessToken: 'mock-token',
      login: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined),
      refreshSession: vi.fn().mockResolvedValue(true),
    };

    const utils = render(
      <AuthContext.Provider value={authContextValue}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route element={<AuthenticatedShell />}>
                <Route path="/users" element={<UsersAccessPage />} />
                <Route path="/users/invite" element={<InviteUserPage />} />
              </Route>
            </Route>
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    return { ...utils, authContextValue };
  };

  it('1. Invite user button is enabled.', async () => {
    renderWithRouter('/users');
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /invite user/i })).toBeDefined();
    });
    const link = screen.getByRole('link', { name: /invite user/i });
    expect(link.hasAttribute('disabled')).toBe(false);
    expect(link.hasAttribute('aria-disabled')).toBe(false);
  });

  it('2. Invite user button navigates to /users/invite.', async () => {
    renderWithRouter('/users');
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /invite user/i })).toBeDefined();
    });
    const link = screen.getByRole('link', { name: /invite user/i });
    expect(link.getAttribute('href')).toBe('/users/invite');
  });

  it('3. /users/invite is protected.', async () => {
    // If not authenticated, we should see login page
    vi.spyOn(demoAuthApi, 'refresh').mockRejectedValue(new Error('Unauthorized'));
    render(
      <AuthProvider authApi={demoAuthApi}>
        <MemoryRouter initialEntries={['/users/invite']}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route element={<AuthenticatedShell />}>
                <Route path="/users/invite" element={<InviteUserPage />} />
              </Route>
            </Route>
            <Route path="/login" element={<div data-testid="login-page">Login</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeDefined();
    });
  });

  it('4. Invite user heading renders.', async () => {
    render(
      <MemoryRouter initialEntries={['/users/invite']}>
        <InviteUserPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Invite user', level: 1 })).toBeDefined();
  });

  it('5. Invite breadcrumb renders.', async () => {
    // Requires shell
    renderWithRouter('/users/invite');
    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeDefined();
      expect(screen.getAllByText('Invite user').length).toBeGreaterThan(0);
    });
  });

  it('6. Users & access breadcrumb links back to /users.', async () => {
    renderWithRouter('/users/invite');
    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeDefined();
    });
    const breadcrumbNav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const usersLink = breadcrumbNav.querySelector('a[href="/users"]');
    expect(usersLink).toBeDefined();
    expect(usersLink?.textContent).toBe('Users & access');
  });

  it('7. empty submission shows required errors.', async () => {
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getAllByRole('button', { name: /Prepare invitation/i })[0]);
    await waitFor(() => {
      expect(screen.getByText('Enter the user’s full name.')).toBeDefined();
      expect(screen.getByText('Enter a valid work email address.')).toBeDefined();
      expect(screen.getByText('Select a role.')).toBeDefined();
    });
  });

  it('8. invalid e-mail is rejected.', async () => {
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Prepare invitation/i })[0]);
    await waitFor(() => {
      expect(screen.getByText('Enter a valid work email address.')).toBeDefined();
    });
  });

  it('9. duplicate demo-user e-mail is rejected.', async () => {
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: demoUsers[0].email } });
    fireEvent.click(screen.getAllByRole('button', { name: /Prepare invitation/i })[0]);
    await waitFor(() => {
      expect(screen.getByText('A user with this email already exists.')).toBeDefined();
    });
  });

  it('10. duplicate e-mail comparison is case-insensitive.', async () => {
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: demoUsers[0].email.toUpperCase() } });
    fireEvent.click(screen.getAllByRole('button', { name: /Prepare invitation/i })[0]);
    await waitFor(() => {
      expect(screen.getByText('A user with this email already exists.')).toBeDefined();
    });
  });

  it('11. full name is trimmed.', async () => {
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: '   John Doe   ' } });
    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Administrator' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Prepare invitation/i })[0]);
    await waitFor(() => {
      expect(screen.getByText('Invitation prepared')).toBeDefined();
      const ddElements = screen.getAllByRole('definition');
      expect(ddElements[0].textContent).toBe('John Doe'); // check if submitted value is trimmed
    });
  });

  it('12. e-mail is normalized to lowercase.', async () => {
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'JOHN@EXAMPLE.COM' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Administrator' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Prepare invitation/i })[0]);
    await waitFor(() => {
      expect(screen.getByText('Invitation prepared')).toBeDefined();
      const ddElements = screen.getAllByRole('definition');
      expect(ddElements[1].textContent).toBe('john@example.com');
    });
  });

  it('13. Supplier role shows only supplier organizations.', async () => {
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Supplier' } });
    await waitFor(() => {
      expect(screen.getByLabelText('Organization')).toBeDefined();
    });
    const options = Array.from(screen.getByLabelText('Organization').querySelectorAll('option')).map(o => o.value);
    expect(options).toContain('northstar-packaging');
    expect(options).toContain('baltic-freight');
    expect(options).toContain('vistula-materials');
  });

  it('14. Supplier role excludes Pernod Ricard Poland.', async () => {
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Supplier' } });
    await waitFor(() => {
      expect(screen.getByLabelText('Organization')).toBeDefined();
    });
    const options = Array.from(screen.getByLabelText('Organization').querySelectorAll('option')).map(o => o.value);
    expect(options).not.toContain('Pernod Ricard Poland');
  });

  it('15. Supplier role fixes warehouse access to Not selected initially.', async () => {
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Supplier' } });
    await waitFor(() => {
      expect(screen.getAllByText('Not selected').length).toBeGreaterThan(0);
    });
  });

  it('16. Administrator fixes organization to Pernod Ricard Poland.', async () => {
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Administrator' } });
    await waitFor(() => {
      const orgInput = screen.getByDisplayValue('Pernod Ricard Poland');
      expect(orgInput).toBeDefined();
      expect(orgInput.hasAttribute('readonly')).toBe(true);
    });
  });

  it('17. Administrator fixes warehouse access to All warehouses.', async () => {
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Administrator' } });
    await waitFor(() => {
      expect(screen.getAllByText('All warehouses').length).toBeGreaterThan(0);
    });
  });

  it('18. Warehouse role displays both warehouse checkboxes.', async () => {
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Warehouse' } });
    await waitFor(() => {
      expect(screen.getByLabelText('Nowy Kisielin Distribution Center')).toBeDefined();
      expect(screen.getByLabelText('Zielona Góra Plant')).toBeDefined();
    });
  });

  it('19. Warehouse role requires at least one warehouse.', async () => {
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Warehouse' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Prepare invitation/i })[0]);
    await waitFor(() => {
      const error = screen.getByText('Select at least one warehouse.');
      const fieldset = screen.getByRole('group', { name: 'Warehouse locations' });
      expect(error.id).toBe('warehouse-access-error');
      expect(fieldset.getAttribute('aria-invalid')).toBe('true');
      expect(fieldset.getAttribute('aria-describedby')).toBe(error.id);
    });
  });

  it('20. multiple warehouses can be selected.', async () => {
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Warehouse' } });
    await waitFor(() => {
      expect(screen.getByLabelText('Nowy Kisielin Distribution Center')).toBeDefined();
    });
    fireEvent.click(screen.getByLabelText('Nowy Kisielin Distribution Center'));
    fireEvent.click(screen.getByLabelText('Zielona Góra Plant'));
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(checkboxes[0].checked).toBe(true);
    expect(checkboxes[1].checked).toBe(true);
  });

  it('21. role changes clear incompatible organization data.', async () => {
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Supplier' } });
    await waitFor(() => {
      expect(screen.getByLabelText('Organization')).toBeDefined();
    });
    fireEvent.change(screen.getByLabelText('Organization'), { target: { value: 'northstar-packaging' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Administrator' } });
    await waitFor(() => {
      expect(screen.getByDisplayValue('Pernod Ricard Poland')).toBeDefined();
    });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Supplier' } });
    await waitFor(() => {
      expect((screen.getByLabelText('Organization') as HTMLSelectElement).value).toBe('');
    });
  });

  it('22. role changes clear incompatible warehouse selections.', async () => {
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Warehouse' } });
    await waitFor(() => {
      fireEvent.click(screen.getByLabelText('Nowy Kisielin Distribution Center'));
    });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Administrator' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Warehouse' } });
    await waitFor(() => {
      expect((screen.getByLabelText('Nowy Kisielin Distribution Center') as HTMLInputElement).checked).toBe(false);
    });
  });

  it('23. a valid Supplier invitation reaches the success state.', async () => {
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'john@supplier.com' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Supplier' } });
    await waitFor(() => {
      fireEvent.change(screen.getByLabelText('Organization'), { target: { value: 'baltic-freight' } });
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Prepare invitation/i })[0]);
    await waitFor(() => {
      expect(screen.getByText('Invitation prepared')).toBeDefined();
    });
  });

  it('24. a valid internal invitation reaches the success state.', async () => {
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'jane@internal.com' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Warehouse manager' } });
    await waitFor(() => {
      fireEvent.click(screen.getByLabelText('Zielona Góra Plant'));
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Prepare invitation/i })[0]);
    await waitFor(() => {
      expect(screen.getByText('Invitation prepared')).toBeDefined();
    });
  });

  it('25. success state displays normalized submitted values.', async () => {
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: '  Jane Doe  ' } });
    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'JANE@INTERNAL.COM' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Administrator' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Prepare invitation/i })[0]);
    await waitFor(() => {
      expect(screen.getByText('Invitation prepared')).toBeDefined();
    });
    const ddElements = screen.getAllByRole('definition');
    expect(ddElements[0].textContent).toBe('Jane Doe');
    expect(ddElements[1].textContent).toBe('jane@internal.com');
  });

  it('26. success state explicitly says no email was sent.', async () => {
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'jane@internal.com' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Administrator' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Prepare invitation/i })[0]);
    await waitFor(() => {
      expect(screen.getByText(/no email was sent/i)).toBeDefined();
    });
  });

  it('27. success state explicitly says no account was created.', async () => {
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'jane@internal.com' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Administrator' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Prepare invitation/i })[0]);
    await waitFor(() => {
      expect(screen.getByText(/no account was created/i)).toBeDefined();
    });
  });

  it('28. Invite another user resets all values.', async () => {
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'jane@internal.com' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Administrator' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Prepare invitation/i })[0]);
    await waitFor(() => {
      expect(screen.getByText('Invitation prepared')).toBeDefined();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Invite another user' }));
    await waitFor(() => {
      expect((screen.getByLabelText(/full name/i) as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText(/work email/i) as HTMLInputElement).value).toBe('');
    });
  });

  it('29. Cancel returns to /users.', async () => {
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Cancel' })).toBeDefined();
    });
    const cancelLink = screen.getByRole('link', { name: 'Cancel' });
    expect(cancelLink.getAttribute('href')).toBe('/users');
  });

  it('30. Back to users returns to /users.', async () => {
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'jane@internal.com' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Administrator' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Prepare invitation/i })[0]);
    await waitFor(() => {
      expect(screen.getByText('Invitation prepared')).toBeDefined();
    });
    // Two "Back to users" links exist in success state (one at top, one at bottom). We can test either.
    const backLinks = screen.getAllByRole('link', { name: /Back to users/i });
    expect(backLinks[0].getAttribute('href')).toBe('/users');
  });

  it('31. no network request is made during the flow.', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'jane@internal.com' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Administrator' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Prepare invitation/i })[0]);
    await waitFor(() => {
      expect(screen.getByText('Invitation prepared')).toBeDefined();
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('32. demoUsers remains unchanged with exactly 8 users.', async () => {
    const initialLength = demoUsers.length;
    render(
      <MemoryRouter>
        <InviteUserPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'jane@internal.com' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Administrator' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Prepare invitation/i })[0]);
    await waitFor(() => {
      expect(screen.getByText('Invitation prepared')).toBeDefined();
    });
    expect(demoUsers.length).toBe(initialLength);
    expect(demoUsers.length).toBe(8);
  });

  it('33. Users & access navigation remains aria-current on /users/invite.', async () => {
    const authContextValue: AuthContextValue = {
      status: 'authenticated',
      isAuthenticated: true,
      accessToken: 'mock-token',
      login: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined),
      refreshSession: vi.fn().mockResolvedValue(true),
    };
    render(
      <AuthContext.Provider value={authContextValue}>
        <MemoryRouter initialEntries={['/users/invite']}>
          <AuthenticatedShell />
        </MemoryRouter>
      </AuthContext.Provider>
    );
    await waitFor(() => {
      const navLinks = screen.getAllByRole('link', { name: /Users & access/i, hidden: true });
      const sidebarLink = navLinks.find(link => link.className.includes('bg-[#023466]'));
      expect(sidebarLink).toBeDefined();
      expect(sidebarLink!.getAttribute('aria-current')).toBe('page');
    });
  });

  it('34. logout still invokes the existing authentication logout.', async () => {
    const authContextValue: AuthContextValue = {
      status: 'authenticated',
      isAuthenticated: true,
      accessToken: 'mock-token',
      login: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined),
      refreshSession: vi.fn().mockResolvedValue(true),
    };
    render(
      <AuthContext.Provider value={authContextValue}>
        <MemoryRouter initialEntries={['/users/invite']}>
          <AuthenticatedShell />
        </MemoryRouter>
      </AuthContext.Provider>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /log out/i, hidden: true })).toBeDefined();
    });
    fireEvent.click(screen.getByRole('button', { name: /log out/i, hidden: true }));
    await waitFor(() => {
      expect(authContextValue.logout).toHaveBeenCalled();
    });
  });

  it('35. existing /users search and filters still work.', async () => {
    render(
      <MemoryRouter>
        <UsersAccessPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search name or email/i)).toBeDefined();
    });
    const searchInput = screen.getByPlaceholderText(/search name or email/i);
    fireEvent.change(searchInput, { target: { value: 'Alice' } });
    await waitFor(() => {
      expect(screen.getAllByText('Alice Smith').length).toBeGreaterThan(0);
      expect(screen.queryByText('Bob Jones')).toBeNull();
    });
  });

  it('36. old warehouse name is no longer rendered.', async () => {
    renderWithRouter('/users/invite');
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Warehouse' } });
    await waitFor(() => {
      expect(screen.queryByText('Pozna\u0144 Distribution Centre')).toBeNull();
    });
  });

  it('37. Nowy Kisielin Distribution Center is rendered for internal roles.', async () => {
    renderWithRouter('/users/invite');
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Warehouse' } });
    await waitFor(() => {
      expect(screen.getByText('Nowy Kisielin Distribution Center')).toBeDefined();
    });
  });

  it('38. Zielona Góra Plant remains available.', async () => {
    renderWithRouter('/users/invite');
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Warehouse' } });
    await waitFor(() => {
      expect(screen.getByText('Zielona Góra Plant')).toBeDefined();
    });
  });

  it('39. internal warehouse checkboxes are generated from centralized data.', async () => {
    renderWithRouter('/users/invite');
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Warehouse' } });
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBe(2);
      expect(checkboxes[0].getAttribute('value')).toBe('nowy-kisielin-distribution-center');
      expect(checkboxes[1].getAttribute('value')).toBe('zielona-gora-plant');
    });
  });

  it('40. Northstar Packaging inherits Nowy Kisielin Distribution Center.', async () => {
    renderWithRouter('/users/invite');
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Supplier' } });
    fireEvent.change(screen.getByLabelText('Organization'), { target: { value: 'northstar-packaging' } });
    await waitFor(() => {
      const accessList = screen.getByTestId('supplier-warehouse-list');
      expect(demoSupplierAssignments['northstar-packaging']).toEqual(['nowy-kisielin-distribution-center']);
      expect(getSupplierWarehouseDisplayNames('northstar-packaging')).toEqual(['Nowy Kisielin Distribution Center']);
      expect(accessList.textContent).toContain('Nowy Kisielin Distribution Center');
      expect(accessList.textContent).not.toContain('Zielona Góra Plant');
    });
  });

  it('41. Baltic Freight inherits Zielona Góra Plant.', async () => {
    renderWithRouter('/users/invite');
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Supplier' } });
    fireEvent.change(screen.getByLabelText('Organization'), { target: { value: 'baltic-freight' } });
    await waitFor(() => {
      const accessList = screen.getByTestId('supplier-warehouse-list');
      expect(accessList.textContent).not.toContain('Nowy Kisielin Distribution Center');
      expect(accessList.textContent).toContain('Zielona Góra Plant');
    });
  });

  it('42. Vistula Materials inherits both warehouses.', async () => {
    renderWithRouter('/users/invite');
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Supplier' } });
    fireEvent.change(screen.getByLabelText('Organization'), { target: { value: 'vistula-materials' } });
    await waitFor(() => {
      const accessList = screen.getByTestId('supplier-warehouse-list');
      expect(accessList.textContent).toContain('Nowy Kisielin Distribution Center');
      expect(accessList.textContent).toContain('Zielona Góra Plant');
    });
  });

  it('43. Supplier does not display warehouse checkboxes.', async () => {
    renderWithRouter('/users/invite');
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Supplier' } });
    await waitFor(() => {
      expect(screen.queryByRole('checkbox')).toBeNull();
    });
  });

  it('44. Supplier summary displays inherited warehouse names.', async () => {
    renderWithRouter('/users/invite');
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Supplier' } });
    fireEvent.change(screen.getByLabelText('Organization'), { target: { value: 'baltic-freight' } });
    await waitFor(() => {
      const summaryItems = screen.getAllByRole('definition');
      expect(summaryItems[5].textContent).toContain('Zielona Góra Plant');
      expect(summaryItems[5].textContent).not.toContain('zielona-gora-plant');
    });
  });

  it('45. Supplier success state displays inherited warehouse names.', async () => {
    renderWithRouter('/users/invite');
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'test@supplier.com' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Supplier' } });
    await waitFor(() => {
      fireEvent.change(screen.getByLabelText('Organization'), { target: { value: 'vistula-materials' } });
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Prepare invitation/i })[0]);
    await waitFor(() => {
      expect(screen.getByText('Invitation prepared')).toBeDefined();
    });
    const summaryItems = screen.getAllByRole('definition');
    expect(summaryItems[4].textContent).toContain('Nowy Kisielin Distribution Center');
    expect(summaryItems[4].textContent).toContain('Zielona Góra Plant');
    expect(summaryItems[4].textContent).not.toContain('nowy-kisielin-distribution-center');
    expect(summaryItems[4].textContent).not.toContain('zielona-gora-plant');
  });

  it('46. changing Supplier organization updates inherited warehouse access.', async () => {
    renderWithRouter('/users/invite');
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Supplier' } });
    fireEvent.change(screen.getByLabelText('Organization'), { target: { value: 'northstar-packaging' } });
    await waitFor(() => {
      expect(screen.getByTestId('supplier-warehouse-list').textContent).toContain('Nowy Kisielin Distribution Center');
    });
    fireEvent.change(screen.getByLabelText('Organization'), { target: { value: 'baltic-freight' } });
    await waitFor(() => {
      expect(screen.getByTestId('supplier-warehouse-list').textContent).toContain('Zielona Góra Plant');
    });
  });

  it('47. changing away from Supplier clears supplier organization data.', async () => {
    renderWithRouter('/users/invite');
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Supplier' } });
    fireEvent.change(screen.getByLabelText('Organization'), { target: { value: 'northstar-packaging' } });
    await waitFor(() => {
      expect(screen.getByTestId('supplier-warehouse-list').textContent).toContain('Nowy Kisielin Distribution Center');
    });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Warehouse' } });
    await waitFor(() => {
      expect(screen.queryByTestId('supplier-warehouse-list')).toBeNull();
      const orgInput = screen.getByLabelText('Organization') as HTMLInputElement;
      expect(orgInput.value).toBe('Pernod Ricard Poland');
    });
  });

  it('48. demoUsers still contains exactly 8 users.', async () => {
    expect(demoUsers.length).toBe(8);
  });

  it('49. no network request is made.', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    renderWithRouter('/users/invite');
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'No Net' } });
    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'no.net@example.com' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Administrator' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Prepare invitation/i })[0]);
    await waitFor(() => {
      expect(screen.getByText('Invitation prepared')).toBeDefined();
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('50. no data is persisted.', async () => {
    const usersSnapshot = demoUsers.map((user) => ({ ...user }));
    renderWithRouter('/users/invite');
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'No Net' } });
    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'no.persist@example.com' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Administrator' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Prepare invitation/i })[0]);
    await waitFor(() => {
      expect(screen.getByText('Invitation prepared')).toBeDefined();
    });
    expect(demoUsers).toHaveLength(8);
    expect(demoUsers).toEqual(usersSnapshot);
    expect(demoUsers.some((user) => user.email === 'no.persist@example.com')).toBe(false);
    expect(screen.getByRole('heading', { name: 'Invitation prepared' })).toBeDefined();
  });
});
