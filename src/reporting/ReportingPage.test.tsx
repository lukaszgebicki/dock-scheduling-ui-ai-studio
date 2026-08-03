// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { AppointmentWorkspaceProvider } from '../appointments/AppointmentWorkspaceProvider';
import { DemoDomainProvider, useDemoDomain } from '../demoDomain/DemoDomainProvider';
import type { DemoActorId } from '../demoDomain/demoDomain';
import { ReportingPage } from './ReportingPage';

function renderPage(actorId: DemoActorId = 'system-administrator') {
  return render(
    <MemoryRouter>
      <DemoDomainProvider initialActorId={actorId}>
        <AppointmentWorkspaceProvider>
          <ReportingPage />
        </AppointmentWorkspaceProvider>
      </DemoDomainProvider>
    </MemoryRouter>,
  );
}

function SwitchActor({ actorId }: { actorId: DemoActorId }) {
  const { setActiveActorId } = useDemoDomain();
  return <button type="button" onClick={() => setActiveActorId(actorId)}>Switch report actor</button>;
}

function activeResultText(): string {
  return screen.getByText((_content, element) =>
    element?.tagName === 'P'
    && element.textContent?.startsWith('Active result:') === true).textContent ?? '';
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ReportingPage', () => {
  it('renders the full inclusive week as one PO row per scoped appointment', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'PO and SKU reports' })).toBeDefined();
    expect(screen.getByLabelText('Report mode')).toHaveProperty('value', 'WEEKLY_ALL_DELIVERIES');
    expect(screen.getByLabelText('Report level')).toHaveProperty('value', 'PO');
    expect(screen.getByLabelText('Inclusive date from')).toHaveProperty('value', '2026-08-10');
    expect(screen.getByLabelText('Inclusive date to')).toHaveProperty('value', '2026-08-16');
    expect(activeResultText()).toContain('4 PO rows');
    const preview = screen.getByRole('heading', { name: 'Active report preview' }).closest('section')!;
    expect(within(preview).getAllByText('APT-WPL-001').length).toBeGreaterThan(0);
    expect(within(preview).getAllByText('APT-WPL-002').length).toBeGreaterThan(0);
    expect(within(preview).getAllByText('APT-NW-2026-001').length).toBeGreaterThan(0);
    expect(within(preview).getAllByText('Awaiting SKU details').length).toBeGreaterThan(0);
  });

  it('applies monthly Slipsheet as SKU rows without fabricated empty lines', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Apply monthly Slipsheet' }));
    expect(screen.getByLabelText('Report mode')).toHaveProperty('value', 'MONTHLY_SLIPSHEET');
    expect(screen.getByLabelText('Report level')).toHaveProperty('value', 'SKU');
    expect(screen.getByLabelText('Inclusive date from')).toHaveProperty('value', '2026-08-01');
    expect(screen.getByLabelText('Inclusive date to')).toHaveProperty('value', '2026-08-31');
    expect(activeResultText()).toContain('4 SKU rows');
    expect(screen.getAllByText('SKU-001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SKU-101').length).toBeGreaterThan(0);
    expect(screen.queryByText('APT-NW-2026-001')).toBeNull();
  });

  it('applies warehouse, Supplier, origin, planning, status and search filters with AND semantics', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Report warehouse'), { target: { value: 'zielona-gora-plant' } });
    fireEvent.change(screen.getByLabelText('Report supplier'), { target: { value: 'baltic-freight' } });
    fireEvent.change(screen.getByLabelText('Report booking origin'), { target: { value: 'ADMIN_ADDED' } });
    fireEvent.change(screen.getByLabelText('Report planning state'), { target: { value: 'READY' } });
    fireEvent.change(screen.getByLabelText('Report appointment status'), { target: { value: 'CONFIRMED' } });
    fireEvent.change(screen.getByLabelText('Report search'), { target: { value: 'TR-210' } });
    expect(activeResultText()).toContain('1 PO rows');
    expect(screen.getAllByText('APT-WPL-002').length).toBeGreaterThan(0);
    expect(screen.queryByText('APT-WPL-001')).toBeNull();
  });

  it('fails closed for reversed ranges and zero selected columns', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Inclusive date from'), { target: { value: '2026-08-20' } });
    fireEvent.change(screen.getByLabelText('Inclusive date to'), { target: { value: '2026-08-10' } });
    expect(screen.getByRole('alert').textContent).toContain('cannot be after');
    expect(screen.getByRole('button', { name: 'Export active CSV' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Export active XLSX' })).toHaveProperty('disabled', true);

    fireEvent.click(screen.getByRole('button', { name: 'Apply full week' }));
    for (const checkbox of screen.getAllByRole('checkbox', { name: /Report column/ })) {
      if ((checkbox as HTMLInputElement).checked) fireEvent.click(checkbox);
    }
    expect(screen.getByRole('alert').textContent).toContain('Select at least one report column');
    expect(screen.getByRole('button', { name: 'Export active CSV' })).toHaveProperty('disabled', true);
  });

  it('sorts the preview and keeps selected column order', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Report sort column'), { target: { value: 'supplier' } });
    fireEvent.change(screen.getByLabelText('Report sort direction'), { target: { value: 'DESC' } });
    const preview = screen.getByRole('heading', { name: 'Active report preview' }).closest('section')!;
    const table = within(preview).getByRole('table');
    const bodyRows = within(table).getAllByRole('row').slice(1);
    expect(bodyRows[0].textContent).toContain('Vistula Materials');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Report column Supplier' }));
    expect(within(table).queryByRole('columnheader', { name: 'Supplier' })).toBeNull();
  });

  it('shows exact Supplier and month summaries', () => {
    renderPage();
    const supplierSection = screen.getByRole('heading', { name: 'Summary by Supplier' }).closest('section')!;
    const vistulaRow = within(supplierSection).getByText('Vistula Materials').closest('tr')!;
    expect(vistulaRow.textContent).toContain('2');
    expect(vistulaRow.textContent).toContain('900');
    expect(vistulaRow.textContent).toContain('3');

    const monthSection = screen.getByRole('heading', { name: 'Summary by month' }).closest('section')!;
    const monthRow = within(monthSection).getByText('2026-08').closest('tr')!;
    expect(monthRow.textContent).toContain('4');
    expect(monthRow.textContent).toContain('3000');
    expect(monthRow.textContent).toContain('7.25');
  });

  it('clears and re-scopes report state when the internal actor changes', () => {
    render(
      <MemoryRouter>
        <DemoDomainProvider>
          <AppointmentWorkspaceProvider>
            <SwitchActor actorId="warehouse-administrator" />
            <ReportingPage />
          </AppointmentWorkspaceProvider>
        </DemoDomainProvider>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Report supplier'), { target: { value: 'baltic-freight' } });
    fireEvent.change(screen.getByLabelText('Report search'), { target: { value: 'TR-210' } });
    expect(activeResultText()).toContain('1 PO rows');

    fireEvent.click(screen.getByRole('button', { name: 'Switch report actor' }));
    expect(screen.getByLabelText('Report supplier')).toHaveProperty('value', 'all');
    expect(screen.getByLabelText('Report search')).toHaveProperty('value', '');
    expect(activeResultText()).toContain('3 PO rows');
    expect(screen.queryByText('Baltic Freight')).toBeNull();
    expect(screen.queryByText('APT-WPL-002')).toBeNull();
  });

  it('downloads CSV and XLSX locally, revokes URLs and performs no network or storage action', () => {
    const createObjectURL = vi.fn()
      .mockReturnValueOnce('blob:csv')
      .mockReturnValueOnce('blob:xlsx');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Export active CSV' }));
    expect(screen.getByRole('status').textContent).toContain('CSV was generated locally');
    fireEvent.click(screen.getByRole('button', { name: 'Export active XLSX' }));
    expect(screen.getByRole('status').textContent).toContain('XLSX was generated locally');

    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(revokeObjectURL).toHaveBeenNthCalledWith(1, 'blob:csv');
    expect(revokeObjectURL).toHaveBeenNthCalledWith(2, 'blob:xlsx');
    expect(click).toHaveBeenCalledTimes(2);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /approve|reject|cancel|reschedule|check in|check out|assign dock/i })).toBeNull();
  });
});
