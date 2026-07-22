// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UsersAccessPage } from './UsersAccessPage';
import { demoUsers } from './demoUsers';

describe('UsersAccessPage', () => {
  afterEach(() => {
    cleanup();
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <UsersAccessPage />
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
    fireEvent.change(roleSelect, { target: { value: 'Security' } });

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

    fireEvent.change(roleSelect, { target: { value: 'Warehouse' } });
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
});
