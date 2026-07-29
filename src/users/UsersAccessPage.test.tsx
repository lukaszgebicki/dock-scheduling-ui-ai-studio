// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { UsersAccessPage } from './UsersAccessPage';
import { demoUsers } from './demoUsers';
import { DemoDomainProvider, useDemoDomain } from '../demoDomain/DemoDomainProvider';
import type { DemoActorId } from '../demoDomain/demoDomain';

function SwitchToSupplierAdministrator() {
  const { setActiveActorId } = useDemoDomain();
  return (
    <button type="button" onClick={() => setActiveActorId('supplier-administrator')}>
      Switch to Supplier Administrator
    </button>
  );
}

describe('UsersAccessPage', () => {
  afterEach(() => {
    cleanup();
  });

  const renderPage = (initialActorId: DemoActorId = 'system-administrator') => {
    return render(
      <MemoryRouter>
        <DemoDomainProvider initialActorId={initialActorId}>
          <UsersAccessPage />
        </DemoDomainProvider>
      </MemoryRouter>
    );
  };

  it('1. Users & access heading renders', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Users & access' })).toBeDefined();
  });

  it('2. all 8 demo users render initially', () => {
    renderPage();
    demoUsers.forEach(user => {
      // Find elements by text
      expect(screen.getAllByText(user.fullName).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('All warehouses')).toHaveLength(2);
    expect(screen.getAllByText('No warehouse assignment')).toHaveLength(2);
  });

  it('3. name search filters the dataset', () => {
    renderPage();
    const searchInput = screen.getByPlaceholderText('Search name or email');
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    expect(screen.getAllByText('Alice Smith').length).toBeGreaterThan(0);
    expect(screen.queryByText('Bob Jones')).toBeNull();
  });

  it('4. email search filters the dataset', () => {
    renderPage();
    const searchInput = screen.getByPlaceholderText('Search name or email');
    fireEvent.change(searchInput, { target: { value: 'bob.jones' } });

    expect(screen.getAllByText('Bob Jones').length).toBeGreaterThan(0);
    expect(screen.queryByText('Alice Smith')).toBeNull();
  });

  it('5. role filter works', () => {
    renderPage();
    const roleSelect = screen.getByLabelText('Filter by role');
    fireEvent.change(roleSelect, { target: { value: 'Security Officer' } });

    expect(screen.getAllByText('Charlie Davis').length).toBeGreaterThan(0);
    expect(screen.queryByText('Alice Smith')).toBeNull();
  });

  it('6. status filter works', () => {
    renderPage();
    const statusSelect = screen.getByLabelText('Filter by status');
    fireEvent.change(statusSelect, { target: { value: 'Inactive' } });

    expect(screen.getAllByText('Charlie Davis').length).toBeGreaterThan(0);
    expect(screen.queryByText('Alice Smith')).toBeNull();
  });

  it('7. organization filter works', () => {
    renderPage();
    const orgSelect = screen.getByLabelText('Filter by organization');
    fireEvent.change(orgSelect, { target: { value: 'Northstar Packaging' } });

    expect(screen.getAllByText('Eve Northstar').length).toBeGreaterThan(0);
    expect(screen.queryByText('Alice Smith')).toBeNull();
  });

  it('8. combined filters use AND logic', () => {
    renderPage();
    const searchInput = screen.getByPlaceholderText('Search name or email');
    const roleSelect = screen.getByLabelText('Filter by role');

    fireEvent.change(roleSelect, { target: { value: 'Warehouse Operator' } });
    // Bob Jones and Henry Ford are Warehouse
    expect(screen.getAllByText('Bob Jones').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Henry Ford').length).toBeGreaterThan(0);

    fireEvent.change(searchInput, { target: { value: 'Bob' } });
    // Now only Bob Jones
    expect(screen.getAllByText('Bob Jones').length).toBeGreaterThan(0);
    expect(screen.queryByText('Henry Ford')).toBeNull();
  });

  it('9. Clear filters restores all users', () => {
    renderPage();
    const searchInput = screen.getByPlaceholderText('Search name or email');
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    expect(screen.queryByText('Bob Jones')).toBeNull();

    const clearBtn = screen.getByRole('button', { name: 'Clear filters' });
    fireEvent.click(clearBtn);

    expect(screen.getAllByText('Bob Jones').length).toBeGreaterThan(0);
  });

  it('10. empty state appears for no matches', () => {
    renderPage();
    const searchInput = screen.getByPlaceholderText('Search name or email');
    fireEvent.change(searchInput, { target: { value: 'NonExistentUser123' } });

    expect(screen.getByRole('heading', { name: 'No users found' })).toBeDefined();
  });

  it('11. empty-state Clear filters restores the list', () => {
    renderPage();
    const searchInput = screen.getByPlaceholderText('Search name or email');
    fireEvent.change(searchInput, { target: { value: 'NonExistentUser123' } });

    const clearBtns = screen.getAllByRole('button', { name: 'Clear filters' });
    fireEvent.click(clearBtns[0]);

    expect(screen.getAllByText('Alice Smith').length).toBeGreaterThan(0);
    expect(screen.queryByRole('heading', { name: 'No users found' })).toBeNull();
  });

  it('12. Invite user link is enabled and opens the invite route', () => {
    renderPage();
    const inviteLink = screen.getByRole('link', { name: /Invite user/i });
    expect(inviteLink.getAttribute('aria-disabled')).not.toBe('true');
    expect(inviteLink.getAttribute('href')).toBe('/users/invite');
  });

  it('13. scopes supplier administration to its own organization', () => {
    renderPage('supplier-administrator');

    expect(screen.getAllByText('Eve Northstar')).toHaveLength(2);
    expect(screen.queryByText('Grace Vistula')).toBeNull();
    expect(screen.queryByText('Demo Administrator')).toBeNull();
    expect(screen.getByRole('link', { name: /Invite user/i }).getAttribute('href'))
      .toBe('/users/invite');
  });

  it('14. hides invite for a warehouse administrator while retaining warehouse-scoped users', () => {
    renderPage('warehouse-administrator');

    expect(screen.queryByRole('link', { name: /Invite user/i })).toBeNull();
    expect(screen.getAllByText('Alice Smith')).toHaveLength(2);
    expect(screen.getAllByText('Eve Northstar')).toHaveLength(2);
    expect(screen.queryByText('Bob Jones')).toBeNull();
  });

  it('15. clears an out-of-scope organization filter when the demo actor changes', () => {
    render(
      <MemoryRouter>
        <DemoDomainProvider>
          <SwitchToSupplierAdministrator />
          <UsersAccessPage />
        </DemoDomainProvider>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Filter by organization'), {
      target: { value: 'Baltic Freight' },
    });
    expect(screen.getAllByText('Frank Baltic')).toHaveLength(2);
    expect(screen.queryByText('Eve Northstar')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Switch to Supplier Administrator' }));

    expect(screen.getByLabelText('Filter by organization'))
      .toHaveProperty('value', 'All organizations');
    expect(screen.queryByRole('option', { name: 'Baltic Freight' })).toBeNull();
    expect(screen.queryByText('Frank Baltic')).toBeNull();
    expect(screen.getAllByText('Eve Northstar')).toHaveLength(2);
  });
});
