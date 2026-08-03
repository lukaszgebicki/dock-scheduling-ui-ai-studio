// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { DemoDomainProvider } from '../demoDomain/DemoDomainProvider';
import { getDemoActor, type DemoActorId } from '../demoDomain/demoDomain';
import {
  addWorkspaceComment,
  createInitialAppointmentWorkspaceState,
  type AppointmentWorkspaceState,
} from './appointmentWorkspace';
import { AppointmentDetailsPage } from './AppointmentDetailsPage';
import { AppointmentWorkspaceProvider } from './AppointmentWorkspaceProvider';

function renderDetails(
  appointmentId: string,
  actorId: DemoActorId = 'system-administrator',
  initialState?: AppointmentWorkspaceState,
) {
  return render(
    <MemoryRouter initialEntries={[`/appointments/${appointmentId}`]}>
      <DemoDomainProvider initialActorId={actorId}>
        <AppointmentWorkspaceProvider initialState={initialState}>
          <Routes>
            <Route path="/appointments/:appointmentId" element={<AppointmentDetailsPage />} />
            <Route path="/appointments" element={<h1>Appointments fallback</h1>} />
          </Routes>
        </AppointmentWorkspaceProvider>
      </DemoDomainProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('AppointmentDetailsPage', () => {
  it('renders the approved detail hierarchy for a scoped internal actor', () => {
    renderDetails('planning-baltic-2001');
    expect(screen.getByRole('heading', { name: 'APT-WPL-002' })).toBeDefined();
    for (const section of [
      'Overview',
      'Delivery Data',
      'Transport',
      'Orders and References',
      'Quantities',
      'Documents',
      'Comments',
      'Status History',
      'Change History',
      'Audit Metadata',
      'Safe inline edit',
    ]) {
      expect(screen.getByRole('heading', { name: section })).toBeDefined();
    }
    expect(screen.getByText('3 SKU lines · 2100 units · 4.25 pallets')).toBeDefined();
    expect(screen.getByText('EXACT_MATCH')).toBeDefined();
    expect(screen.getByText('batch-demo-1')).toBeDefined();
    expect(screen.getByText(/Requires decision: Yes/)).toBeDefined();
  });

  it('shows Supplier-safe SKU contents but excludes diagnostics, lineage and internal notes', () => {
    renderDetails('planning-vistula-3001', 'supplier-user');
    expect(screen.getByRole('heading', { name: 'APT-WPL-003' })).toBeDefined();
    expect(screen.getByText('SKU-101')).toBeDefined();
    expect(screen.getByText('Glass packaging')).toBeDefined();
    expect(screen.queryByText('EXACT_MATCH')).toBeNull();
    expect(screen.queryByText('batch-demo-1')).toBeNull();
    expect(screen.getByText('Technical audit metadata is not available in this role.')).toBeDefined();
    expect(screen.getByText(/Supplier-safe view/)).toBeDefined();
    expect(screen.queryByRole('option', { name: 'Internal Note' })).toBeNull();
  });

  it('renders Awaiting SKU details rather than zero quantities', () => {
    renderDetails('planning-northstar-1001');
    const quantities = screen.getByRole('heading', { name: 'Quantities' }).closest('section')!;
    expect(within(quantities).getByText('Awaiting SKU details')).toBeDefined();
    expect(within(quantities).queryByText(/0 units/)).toBeNull();
  });

  it('requires explicit comment visibility and records a Shared Comment with local history', () => {
    renderDetails('planning-baltic-2001');
    fireEvent.change(screen.getByLabelText('Comment text'), { target: { value: 'Shared arrival clarification' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add local comment' }));
    expect(screen.getByRole('status').textContent).toContain('visibility');

    fireEvent.change(screen.getByLabelText('Comment visibility'), { target: { value: 'SHARED_COMMENT' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add local comment' }));
    expect(screen.getByRole('status').textContent).toContain('local memory only');
    const commentsSection = screen.getByRole('heading', { name: 'Comments' }).closest('section')!;
    expect(within(commentsSection).getByText((_content, element) =>
      element?.tagName === 'LI'
      && element.textContent?.includes('Shared arrival clarification') === true)).toBeDefined();
    expect(screen.getByText(/ADD_COMMENT · SHARED_COMMENT/)).toBeDefined();
  });

  it('never exposes an Internal Note or its history to a Supplier actor', () => {
    const base = createInitialAppointmentWorkspaceState();
    const state = addWorkspaceComment(
      base,
      'planning-vistula-3001',
      getDemoActor('system-administrator'),
      true,
      'INTERNAL_NOTE',
      'SECRET INTERNAL NOTE',
      'Internal review only',
    ).state;
    renderDetails('planning-vistula-3001', 'supplier-user', state);
    expect(screen.queryByText('SECRET INTERNAL NOTE')).toBeNull();
    expect(screen.queryByText(/ADD_COMMENT · INTERNAL_NOTE/)).toBeNull();
  });

  it('allows Supplier-safe vehicle correction on its own non-weekly record', () => {
    renderDetails('appointment-nonweekly-vistula-001', 'supplier-user');
    fireEvent.change(screen.getByLabelText('Safe field'), { target: { value: 'tractorRegistration' } });
    expect(screen.getByLabelText('Replacement value')).toHaveProperty('value', 'TR-NW-100');
    fireEvent.change(screen.getByLabelText('Replacement value'), { target: { value: 'TR-NW-101' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply safe local edit' }));
    expect(screen.getByRole('status').textContent).toContain('local memory only');
    expect(screen.getByText('TR-NW-101')).toBeDefined();
    expect(screen.getByText(/SAFE_EDIT · tractorRegistration · TR-NW-100 → TR-NW-101/)).toBeDefined();
    expect(screen.getByText('TRL-NW-200')).toBeDefined();
  });

  it('allows explicit Administrator transport correction and updates local reconciliation only', () => {
    renderDetails('planning-baltic-2001');
    expect(screen.getByText(/Requires decision: Yes/)).toBeDefined();
    fireEvent.change(screen.getByLabelText('Safe field'), { target: { value: 'tractorRegistration' } });
    fireEvent.change(screen.getByLabelText('Replacement value'), { target: { value: 'TR-IMPORT-999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply safe local edit' }));
    expect(screen.getByRole('status').textContent).toContain('No lifecycle, slot, gate or persistence action');
    expect(screen.getByText(/Requires decision: No/)).toBeDefined();
    expect(screen.getAllByText('TR-IMPORT-999').length).toBeGreaterThan(0);
  });

  it('does not offer transport-authority edits to a Warehouse Operator', () => {
    renderDetails('planning-baltic-2001', 'warehouse-operator');
    const safeField = screen.getByLabelText('Safe field');
    expect(within(safeField).queryByRole('option', { name: 'Tractor registration' })).toBeNull();
    expect(within(safeField).queryByRole('option', { name: 'Trailer or container registration' })).toBeNull();
    expect(within(safeField).getByRole('option', { name: 'Contact name' })).toBeDefined();
  });

  it('keeps Security on a restricted projection without internal diagnostics or edits', () => {
    renderDetails('planning-northstar-1001', 'security-officer');
    expect(screen.getByText('Administrator reconciliation diagnostics are not available in this role.')).toBeDefined();
    expect(screen.getByText('Technical audit metadata is not available in this role.')).toBeDefined();
    expect(screen.getByText('No safe inline field is editable for this actor and operational state.')).toBeDefined();
    expect(screen.queryByRole('option', { name: 'Internal Note' })).toBeNull();
  });

  it('has no network, browser storage, document or hidden business actions', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    renderDetails('planning-baltic-2001');
    fireEvent.change(screen.getByLabelText('Comment visibility'), { target: { value: 'SHARED_COMMENT' } });
    fireEvent.change(screen.getByLabelText('Comment text'), { target: { value: 'Local comment' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add local comment' }));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /approve|reject|request data|reschedule|cancel|restore|check in|check out|assign dock|no show/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /upload|download/i })).toBeNull();
    expect(screen.getByText(/No upload, download or document storage action/)).toBeDefined();
  });
});
