// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { initialDemoConfiguration } from '../demoDomain/configuration';
import { getDemoActor } from '../demoDomain/demoDomain';
import { CapacityDemonstration } from './CapacityDemonstration';

afterEach(cleanup);

describe('CapacityDemonstration', () => {
  it('shows exactly one winner, one conflict and deterministic safe alternatives', () => {
    render(
      <CapacityDemonstration
        actor={getDemoActor('system-administrator')}
        warehouses={initialDemoConfiguration.warehouses}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run final-capacity demonstration' }));

    expect(screen.getByText('RESERVED')).toBeDefined();
    expect(screen.getByText('RESERVATION_CONFLICT')).toBeDefined();
    expect(screen.getByText('2026-08-13 · 09:30')).toBeDefined();
    expect(screen.getByText('2026-08-13 · 09:45')).toBeDefined();
    expect(screen.getByText('2026-08-13 · 10:00')).toBeDefined();
    expect(document.body.textContent).not.toContain('northstar-packaging');
    expect(document.body.textContent).not.toContain('vistula-materials');
    expect(document.body.textContent).not.toContain('capacity-demo-existing');
  });

  it('requires a reason and records an authorized local override', () => {
    render(
      <CapacityDemonstration
        actor={getDemoActor('warehouse-administrator')}
        warehouses={initialDemoConfiguration.warehouses}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run final-capacity demonstration' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply local capacity override' }));
    expect(screen.getByRole('alert').textContent).toBe('A capacity override requires a reason.');

    fireEvent.change(screen.getByLabelText('Override reason'), {
      target: { value: 'Temporary recovery capacity' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply local capacity override' }));

    expect(screen.getByRole('status').textContent).toContain('Temporary recovery capacity');
    expect(screen.getByRole('status').textContent).toContain('Before CAPACITY_EXCEEDED; after AVAILABLE');
  });

  it('hides override controls from Supplier and resets results on actor change', () => {
    const { rerender } = render(
      <CapacityDemonstration
        actor={getDemoActor('system-administrator')}
        warehouses={initialDemoConfiguration.warehouses}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Run final-capacity demonstration' }));
    expect(screen.getByText('RESERVATION_CONFLICT')).toBeDefined();

    rerender(
      <CapacityDemonstration
        actor={getDemoActor('supplier-administrator')}
        warehouses={initialDemoConfiguration.warehouses}
      />,
    );

    expect(screen.queryByText('RESERVATION_CONFLICT')).toBeNull();
    expect(screen.queryByLabelText('Override reason')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Apply local capacity override' })).toBeNull();
    expect(screen.getByText(/active role cannot override capacity/)).toBeDefined();
  });
});
