import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AddWarehousePage } from './AddWarehousePage';
import { demoWarehouses } from '../users/demoAccessScope';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/warehouses/new']}>
      <Routes>
        <Route path="/warehouses/new" element={<AddWarehousePage />} />
        <Route path="/warehouses" element={<div>Warehouses Page Mock</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function getTextbox(name: string): HTMLInputElement {
  const element = screen.getByRole('textbox', { name });

  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Expected ${name} to be an input element.`);
  }

  return element;
}

function submitWarehouse() {
  fireEvent.click(screen.getByRole('button', { name: 'Prepare warehouse' }));
}

async function expectValidationMessage(message: string) {
  await waitFor(() => {
    expect(screen.getByRole('alert').textContent).toBe(message);
  });
}

async function submitValidWarehouse(name = 'New Valid Warehouse') {
  fireEvent.change(getTextbox('Warehouse name'), { target: { value: name } });
  submitWarehouse();
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: 'Warehouse prepared', level: 1 }).textContent)
      .toBe('Warehouse prepared');
  });
}

describe('AddWarehousePage tests', () => {
  it('1. exposes truthful warehouse navigation context and the exact back href;', () => {
    renderPage();
    const backLink = screen.getByRole('link', { name: 'Back to warehouses' });

    expect(backLink.getAttribute('href')).toBe('/warehouses');
    expect(screen.queryByText(/protected route/i)).toBeNull();
  });

  it('2. renders the page heading and supporting description;', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Add warehouse', level: 1 }).textContent).toBe('Add warehouse');
    expect(screen.getByText('Define the warehouse name and stable system identifier.').textContent)
      .toBe('Define the warehouse name and stable system identifier.');
  });

  it('3. returns to the warehouse overview from the initial back link;', () => {
    renderPage();
    fireEvent.click(screen.getByRole('link', { name: 'Back to warehouses' }));

    expect(screen.getByText('Warehouses Page Mock').textContent).toBe('Warehouses Page Mock');
  });

  it('4. starts with an empty name and a read-only empty Warehouse ID;', () => {
    renderPage();
    const nameInput = getTextbox('Warehouse name');
    const idInput = getTextbox('Warehouse ID');

    expect(nameInput.value).toBe('');
    expect(nameInput.getAttribute('aria-invalid')).toBe('false');
    expect(nameInput.getAttribute('aria-describedby')).toBeNull();
    expect(idInput.value).toBe('');
    expect(idInput.readOnly).toBe(true);
  });

  it('5. renders the exact initial live summary and access explanation;', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Summary', level: 2 }).textContent).toContain('Summary');
    expect(screen.getByText('Not selected').textContent).toBe('Not selected');
    expect(screen.getByText('Not generated').textContent).toBe('Not generated');
    expect(screen.getByText('Not configured').textContent).toBe('Not configured');
    expect(screen.getByText('Supplier organization access will be configured separately.').textContent)
      .toBe('Supplier organization access will be configured separately.');
  });

  it('6. updates the ID field and summary from the live name value;', () => {
    renderPage();
    fireEvent.change(getTextbox('Warehouse name'), { target: { value: '  Test Warehouse  ' } });

    expect(getTextbox('Warehouse ID').value).toBe('test-warehouse');
    expect(screen.getByText('Test Warehouse').textContent).toBe('Test Warehouse');
    expect(screen.getByText('test-warehouse', { selector: 'dd' }).textContent).toBe('test-warehouse');
  });

  it('7. generates a stable ID from Polish characters;', () => {
    renderPage();
    fireEvent.change(getTextbox('Warehouse name'), { target: { value: 'Łódź' } });

    expect(getTextbox('Warehouse ID').value).toBe('lodz');
  });

  it('8. collapses repeated separators and lowercases the stable ID;', () => {
    renderPage();
    fireEvent.change(getTextbox('Warehouse name'), { target: { value: 'UPPER   Case---Warehouse' } });

    expect(getTextbox('Warehouse ID').value).toBe('upper-case-warehouse');
  });

  it('9. reports only required-name validation for empty input with linked ARIA error state;', async () => {
    renderPage();
    submitWarehouse();
    await expectValidationMessage('Enter the warehouse name.');

    const nameInput = getTextbox('Warehouse name');
    const alert = screen.getByRole('alert');
    expect(nameInput.getAttribute('aria-invalid')).toBe('true');
    expect(nameInput.getAttribute('aria-describedby')).toBe('name-error');
    expect(alert.id).toBe('name-error');
    expect(screen.queryByText('Enter a warehouse name that can generate a valid ID.')).toBeNull();
  });

  it('10. reports only required-name validation for whitespace-only input;', async () => {
    renderPage();
    fireEvent.change(getTextbox('Warehouse name'), { target: { value: '   ' } });
    submitWarehouse();
    await expectValidationMessage('Enter the warehouse name.');

    expect(screen.queryByText('Enter a warehouse name that can generate a valid ID.')).toBeNull();
  });

  it('11. reports only required-name validation for one-character input;', async () => {
    renderPage();
    fireEvent.change(getTextbox('Warehouse name'), { target: { value: 'A' } });
    submitWarehouse();
    await expectValidationMessage('Enter the warehouse name.');

    expect(screen.queryByText('Enter a warehouse name that can generate a valid ID.')).toBeNull();
  });

  it('12. reports only required-name validation for input over 80 characters;', async () => {
    renderPage();
    fireEvent.change(getTextbox('Warehouse name'), { target: { value: 'A'.repeat(81) } });
    submitWarehouse();
    await expectValidationMessage('Enter the warehouse name.');

    expect(screen.queryByText('Enter a warehouse name that can generate a valid ID.')).toBeNull();
  });

  it('13. reports only invalid-ID validation for a symbol-only valid-length name;', async () => {
    renderPage();
    fireEvent.change(getTextbox('Warehouse name'), { target: { value: '---' } });
    submitWarehouse();
    await expectValidationMessage('Enter a warehouse name that can generate a valid ID.');

    expect(screen.queryByText('Enter the warehouse name.')).toBeNull();
  });

  it('14. reports only duplicate-name validation for the exact existing display name;', async () => {
    renderPage();
    fireEvent.change(getTextbox('Warehouse name'), { target: { value: 'Nowy Kisielin Distribution Center' } });
    submitWarehouse();
    await expectValidationMessage('A warehouse with this name already exists.');

    expect(screen.queryByText('A warehouse with this ID already exists.')).toBeNull();
  });

  it('15. reports only duplicate-name validation for a case-insensitive match;', async () => {
    renderPage();
    fireEvent.change(getTextbox('Warehouse name'), { target: { value: 'NOWY KISIELIN DISTRIBUTION CENTER' } });
    submitWarehouse();
    await expectValidationMessage('A warehouse with this name already exists.');

    expect(screen.queryByText('A warehouse with this ID already exists.')).toBeNull();
  });

  it('16. reports duplicate-name rather than duplicate-ID for a canonically equivalent name;', async () => {
    renderPage();
    fireEvent.change(getTextbox('Warehouse name'), { target: { value: 'Zielona Go\u0301ra Plant' } });
    submitWarehouse();
    await expectValidationMessage('A warehouse with this name already exists.');

    expect(screen.queryByText('A warehouse with this ID already exists.')).toBeNull();
  });

  it('17. reports only duplicate-ID validation for a genuinely different name with the same ID;', async () => {
    renderPage();
    fireEvent.change(getTextbox('Warehouse name'), { target: { value: 'nowy-kisielin-distribution-center' } });
    submitWarehouse();
    await expectValidationMessage('A warehouse with this ID already exists.');

    expect(screen.queryByText('A warehouse with this name already exists.')).toBeNull();
  });

  it('18. submits valid data and shows exact normalized success details and demo notice;', async () => {
    renderPage();
    await submitValidWarehouse('  New Valid Warehouse  ');

    expect(screen.getByText('The warehouse details were validated successfully.').textContent)
      .toBe('The warehouse details were validated successfully.');
    expect(screen.getByText('Demo mode: no warehouse was created and no data was saved.').textContent)
      .toBe('Demo mode: no warehouse was created and no data was saved.');
    expect(screen.getByText('New Valid Warehouse').textContent).toBe('New Valid Warehouse');
    expect(screen.getByText('new-valid-warehouse').textContent).toBe('new-valid-warehouse');
    expect(screen.getByText('Not configured').textContent).toBe('Not configured');
  });

  it('19. announces success politely without navigating away on submit;', async () => {
    renderPage();
    await submitValidWarehouse();
    const successRegion = screen.getByRole('region');

    expect(successRegion.getAttribute('aria-live')).toBe('polite');
    expect(screen.queryByText('Warehouses Page Mock')).toBeNull();
  });

  it('20. does not mutate the centralized demo warehouses;', async () => {
    const originalWarehouses = [...demoWarehouses];
    renderPage();
    await submitValidWarehouse();

    expect(demoWarehouses).toEqual(originalWarehouses);
  });

  it('21. performs no network request or storage write;', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    renderPage();
    await submitValidWarehouse();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });

  it('22. Prepare another warehouse clears successful values and restores the initial summary;', async () => {
    renderPage();
    await submitValidWarehouse();
    fireEvent.click(screen.getByRole('button', { name: 'Prepare another warehouse' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Add warehouse', level: 1 }).textContent).toBe('Add warehouse');
    });
    expect(getTextbox('Warehouse name').value).toBe('');
    expect(getTextbox('Warehouse ID').value).toBe('');
    expect(screen.getByText('Not selected').textContent).toBe('Not selected');
    expect(screen.getByText('Not generated').textContent).toBe('Not generated');
    expect(screen.getByText('Not configured').textContent).toBe('Not configured');
  });

  it('23. Prepare another warehouse clears prior validation errors;', async () => {
    renderPage();
    submitWarehouse();
    await expectValidationMessage('Enter the warehouse name.');
    await submitValidWarehouse();
    fireEvent.click(screen.getByRole('button', { name: 'Prepare another warehouse' }));

    const nameInput = getTextbox('Warehouse name');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(nameInput.getAttribute('aria-invalid')).toBe('false');
    expect(nameInput.getAttribute('aria-describedby')).toBeNull();
  });

  it('24. returns to the warehouse overview from the success-state back link;', async () => {
    renderPage();
    await submitValidWarehouse();
    fireEvent.click(within(screen.getByRole('region')).getByRole('link', { name: 'Back to warehouses' }));

    expect(screen.getByText('Warehouses Page Mock').textContent).toBe('Warehouses Page Mock');
  });
});
