// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { DemoDomainProvider } from '../demoDomain/DemoDomainProvider';
import type { DemoActorId } from '../demoDomain/demoDomain';
import { FridayImportGuard } from './FridayImportGuard';
import { FridayImportPage } from './FridayImportPage';
import { fridayImportHeaders } from './fridayImport';

function renderRoute(initialActorId: DemoActorId) {
  return render(
    <MemoryRouter initialEntries={['/imports/friday-details']}>
      <DemoDomainProvider initialActorId={initialActorId}>
        <Routes>
          <Route
            path="/imports/friday-details"
            element={<FridayImportGuard><FridayImportPage /></FridayImportGuard>}
          />
          <Route path="/appointments" element={<h1>Appointments fallback</h1>} />
          <Route path="/users" element={<h1>Users fallback</h1>} />
        </Routes>
      </DemoDomainProvider>
    </MemoryRouter>,
  );
}

function csvFile(text: string, name = 'friday.csv'): File {
  const file = new File([text], name, { type: 'text/csv' });
  Object.defineProperty(file, 'text', { value: async () => text });
  return file;
}

const header = fridayImportHeaders.join(',');
const exactRow = [
  'zielona-gora-plant',
  'baltic-freight',
  'PO-DEMO-2001',
  '2026-W33',
  '1',
  'SKU-900',
  'Imported product',
  '100',
  '2',
  'EURO_PALLET',
  'DRY_GOODS',
  'Standard',
  'DIFFERENT-TRACTOR',
  'TRL-220',
].join(',');

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Friday import page', () => {
  it('allows Warehouse Administrator as primary RUN actor inside assigned scope', () => {
    renderRoute('warehouse-administrator');

    expect(screen.getByRole('heading', { name: 'Friday PO/SKU import preview' })).toBeDefined();
    expect((screen.getByRole('combobox', { name: 'Warehouse scope' }) as HTMLSelectElement).value)
      .toBe('nowy-kisielin-distribution-center');
  });

  it('allows System Administrator only through delegated warehouse scope', () => {
    renderRoute('system-administrator');

    expect(screen.getByRole('heading', { name: 'Friday PO/SKU import preview' })).toBeDefined();
    const warehouse = screen.getByRole('combobox', { name: 'Warehouse scope' }) as HTMLSelectElement;
    expect(warehouse.value).toBe('zielona-gora-plant');
    expect(screen.queryByRole('option', { name: 'Nowy Kisielin Distribution Center' })).toBeNull();
  });

  it.each<DemoActorId>([
    'warehouse-operator',
    'security-officer',
    'supplier-administrator',
    'supplier-user',
  ])('fails closed on direct route for unauthorized actor %s', (actorId) => {
    renderRoute(actorId);

    expect(screen.queryByRole('heading', { name: 'Friday PO/SKU import preview' })).toBeNull();
    expect(screen.getByRole('heading', { name: /fallback/i })).toBeDefined();
    expect(screen.queryByLabelText('Friday delivery-details CSV')).toBeNull();
  });

  it('uses a native local file input and renders stable exact-match evidence without apply action', async () => {
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    renderRoute('system-administrator');

    const input = screen.getByLabelText('Friday delivery-details CSV');
    expect(input.tagName).toBe('INPUT');
    expect(input.getAttribute('type')).toBe('file');

    fireEvent.change(input, { target: { files: [csvFile(`${header}\n${exactRow}`)] } });

    await waitFor(() => expect(screen.getByText('PO-DEMO-2001')).toBeDefined());
    expect(screen.getAllByText('EXACT_MATCH')).toHaveLength(2);
    expect(screen.getByText(/Transport reconciliation required/)).toBeDefined();
    expect(screen.getByText(/No overwrite occurred/)).toBeDefined();
    expect(screen.queryByRole('button', { name: /apply|import|confirm/i })).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });

  it('shows file validation errors with no group or hidden apply affordance', async () => {
    renderRoute('warehouse-administrator');
    const input = screen.getByLabelText('Friday delivery-details CSV');

    fireEvent.change(input, { target: { files: [csvFile('wrong,headers\n1,2')] } });

    await waitFor(() => expect(screen.getByRole('alert')).toBeDefined());
    expect(screen.getByText(/Missing headers/)).toBeDefined();
    expect(screen.queryByRole('button', { name: /apply|import|confirm/i })).toBeNull();
  });
});
