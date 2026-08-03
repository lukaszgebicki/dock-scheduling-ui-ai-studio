// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { DemoDomainProvider } from '../demoDomain/DemoDomainProvider';
import type { DemoActorId } from '../demoDomain/demoDomain';
import { PlanningCalendarPage } from './PlanningCalendarPage';

function renderPage(initialActorId: DemoActorId) {
  return render(
    <MemoryRouter>
      <DemoDomainProvider initialActorId={initialActorId}>
        <PlanningCalendarPage />
      </DemoDomainProvider>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('PO planning calendar page', () => {
  it('AC-CAL-002 renders one card for the three-line PO and exact derived totals', () => {
    renderPage('system-administrator');

    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getByRole('heading', { name: 'PO-DEMO-2001' })).toBeDefined();
    expect(screen.getByText('3 SKU · 2100 units · 4.25 pallets')).toBeDefined();
    expect(screen.getAllByRole('heading', { level: 2 }).filter((heading) =>
      heading.textContent === 'PO-DEMO-2001')).toHaveLength(1);
  });

  it('AC-CAL-004 shows Awaiting SKU details without fabricated zero quantities', () => {
    renderPage('supplier-administrator');

    expect(screen.getByRole('heading', { name: 'PO-DEMO-1001' })).toBeDefined();
    expect(screen.getByText('Awaiting SKU details')).toBeDefined();
    expect(document.body.textContent).not.toContain('0 pallets');
    expect(document.body.textContent).not.toContain('0 units');
  });

  it('AC-CAL-003 uses the exact Polish label on a native keyboard-operable control', () => {
    renderPage('supplier-user');

    const action = screen.getByRole('button', { name: 'Pokaż zawartość dostawy' });
    expect(action.tagName).toBe('BUTTON');
    expect(action.getAttribute('type')).toBe('button');
    expect(action.getAttribute('aria-expanded')).toBe('false');

    action.focus();
    expect(document.activeElement).toBe(action);
    fireEvent.click(action);

    expect(action.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('SKU-101')).toBeDefined();
    expect(screen.getByText('Fragile')).toBeDefined();
  });

  it('keeps Supplier visibility inside organization and warehouse scope', () => {
    renderPage('supplier-administrator');

    expect(screen.getByRole('heading', { name: 'PO-DEMO-1001' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'PO-DEMO-2001' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'PO-DEMO-3001' })).toBeNull();
    expect(document.body.textContent).not.toContain('Internal import review complete');
    expect(document.body.textContent).not.toContain('batch-demo-1');
    expect(document.body.textContent).not.toContain('EXACT_MATCH');
  });

  it('keeps internal users warehouse-scoped', () => {
    renderPage('warehouse-administrator');

    expect(screen.getByRole('heading', { name: 'PO-DEMO-1001' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'PO-DEMO-3001' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'PO-DEMO-2001' })).toBeNull();
  });

  it('exposes planning state independently from appointment lifecycle status', () => {
    renderPage('supplier-administrator');

    expect(screen.getByText('AWAITING_DETAILS')).toBeDefined();
    expect(screen.getByText('SUBMITTED')).toBeDefined();
  });
});
