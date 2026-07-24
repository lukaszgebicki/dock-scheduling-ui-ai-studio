import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AddSupplierOrganizationPage } from './AddSupplierOrganizationPage';
import { supplierOrganizationSchema } from './supplierOrganizationSchema';
import { demoSupplierOrganizations, demoSupplierAssignments } from '../users/demoAccessScope';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/supplier-organizations/new']}>
      <Routes>
        <Route path="/supplier-organizations/new" element={<AddSupplierOrganizationPage />} />
        <Route path="/supplier-organizations" element={<div>Supplier Organizations Page Mock</div>} />
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

function getCheckbox(name: string): HTMLInputElement {
  const element = screen.getByRole('checkbox', { name });

  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Expected ${name} to be a checkbox element.`);
  }

  return element;
}

function submitForm() {
  fireEvent.click(screen.getByRole('button', { name: 'Prepare organization' }));
}

function expectSummaryValue(label: string, value: string) {
  const term = screen.getByText(label, { selector: 'dt' });
  const container = term.parentElement;

  if (!container) {
    throw new Error(`Expected ${label} to have a sibling value.`);
  }

  expect(within(container).getByText(value).textContent).toBe(value);
}

async function expectValidationMessage(message: string) {
  await waitFor(() => {
    expect(screen.getByRole('alert').textContent).toBe(message);
  });
}

function getIcon(element: Element): SVGSVGElement {
  const icon = element.querySelector('svg');

  if (!icon) {
    throw new Error('Expected the element to contain an icon.');
  }

  return icon;
}

function getSchemaFailureMessages(input: unknown): string[] {
  const result = supplierOrganizationSchema.safeParse(input);

  if (result.success) {
    throw new Error('Expected supplierOrganizationSchema.safeParse to fail for this input.');
  }

  return result.error.issues.map((issue) => issue.message);
}

async function submitValidOrganization(
  name = 'New Valid Organization',
  warehouseNames: string[] = ['Nowy Kisielin Distribution Center'],
) {
  fireEvent.change(getTextbox('Supplier organization name'), { target: { value: name } });
  warehouseNames.forEach((warehouseName) => {
    fireEvent.click(getCheckbox(warehouseName));
  });
  submitForm();
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: 'Supplier organization prepared', level: 1 }).textContent)
      .toBe('Supplier organization prepared');
  });
}

describe('AddSupplierOrganizationPage', () => {
  it('1. exposes truthful navigation context and the exact back href;', () => {
    renderPage();
    const backLink = screen.getByRole('link', { name: 'Back to supplier organizations' });

    expect(backLink.getAttribute('href')).toBe('/supplier-organizations');
    expect(screen.queryByText(/protected route/i)).toBeNull();

    const backLinkIcon = backLink.querySelector('svg');
    if (!backLinkIcon) {
      throw new Error('Expected the back link to contain a decorative icon.');
    }
    expect(backLinkIcon.getAttribute('aria-hidden')).toBe('true');
    expect(backLink.textContent).toBe('Back to supplier organizations');
  });

  it('2. renders the page heading and exact supporting copy;', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Add supplier organization', level: 1 }).textContent)
      .toBe('Add supplier organization');
    expect(screen.getByText('Define the organization identity and inherited warehouse access.').textContent)
      .toBe('Define the organization identity and inherited warehouse access.');
  });

  it('3. returns to the overview from the initial back link;', () => {
    renderPage();
    fireEvent.click(screen.getByRole('link', { name: 'Back to supplier organizations' }));

    expect(screen.getByText('Supplier Organizations Page Mock').textContent).toBe('Supplier Organizations Page Mock');
  });

  it('4. starts with an empty name and a read-only empty Organization ID;', () => {
    renderPage();
    const nameInput = getTextbox('Supplier organization name');
    const idInput = getTextbox('Organization ID');

    expect(nameInput.value).toBe('');
    expect(nameInput.getAttribute('aria-invalid')).toBe('false');
    expect(nameInput.getAttribute('aria-describedby')).toBeNull();
    expect(idInput.value).toBe('');
    expect(idInput.readOnly).toBe(true);
    expect(idInput.disabled).toBe(false);
  });

  it('5. renders the exact initial live summary and inheritance explanation;', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Summary', level: 2 }).textContent).toBe('Summary');
    expectSummaryValue('Supplier organization name', 'Not selected');
    expectSummaryValue('Organization ID', 'Not generated');
    expectSummaryValue('Warehouse access', 'Not selected');
    expect(screen.getByText('Supplier users will inherit the warehouse access assigned to their organization.').textContent)
      .toBe('Supplier users will inherit the warehouse access assigned to their organization.');
  });

  it('6. updates the ID field and summary from the live name value;', () => {
    renderPage();
    fireEvent.change(getTextbox('Supplier organization name'), { target: { value: '  Fresh Logistics Group  ' } });

    expect(getTextbox('Organization ID').value).toBe('fresh-logistics-group');
    expectSummaryValue('Supplier organization name', 'Fresh Logistics Group');
    expectSummaryValue('Organization ID', 'fresh-logistics-group');
  });

  it('7. generates a stable ID from Polish characters;', () => {
    renderPage();
    fireEvent.change(getTextbox('Supplier organization name'), { target: { value: 'Łódź Packaging & Logistics' } });

    expect(getTextbox('Organization ID').value).toBe('lodz-packaging-logistics');
  });

  it('8. collapses repeated separators and lowercases the stable ID;', () => {
    renderPage();
    fireEvent.change(getTextbox('Supplier organization name'), { target: { value: '  Baltic   Freight---Poland  ' } });

    expect(getTextbox('Organization ID').value).toBe('baltic-freight-poland');
  });

  it('9. reports only required-name validation for empty input with linked ARIA error state;', async () => {
    renderPage();
    submitForm();
    await expectValidationMessage('Enter the supplier organization name.');

    const nameInput = getTextbox('Supplier organization name');
    const alert = screen.getByRole('alert');
    expect(nameInput.getAttribute('aria-invalid')).toBe('true');
    expect(nameInput.getAttribute('aria-describedby')).toBe('name-error');
    expect(alert.id).toBe('name-error');
    expect(screen.queryByText('Enter a supplier organization name that can generate a valid ID.')).toBeNull();
  });

  it('10. reports only required-name validation for whitespace-only input;', async () => {
    renderPage();
    fireEvent.change(getTextbox('Supplier organization name'), { target: { value: '   ' } });
    submitForm();
    await expectValidationMessage('Enter the supplier organization name.');

    expect(screen.queryByText('Enter a supplier organization name that can generate a valid ID.')).toBeNull();
  });

  it('11. reports only required-name validation for one-character input;', async () => {
    renderPage();
    fireEvent.change(getTextbox('Supplier organization name'), { target: { value: 'A' } });
    submitForm();
    await expectValidationMessage('Enter the supplier organization name.');

    expect(screen.queryByText('Enter a supplier organization name that can generate a valid ID.')).toBeNull();

    expect(
      getSchemaFailureMessages({ name: 'A', warehouseAccess: ['not-a-real-warehouse'] }),
    ).toEqual(['Enter the supplier organization name.']);
  });

  it('12. reports only required-name validation for input over 80 characters;', async () => {
    renderPage();
    fireEvent.change(getTextbox('Supplier organization name'), { target: { value: 'A'.repeat(81) } });
    submitForm();
    await expectValidationMessage('Enter the supplier organization name.');

    expect(screen.queryByText('Enter a supplier organization name that can generate a valid ID.')).toBeNull();
  });

  it('13. reports only invalid-ID validation for a symbol-only valid-length name;', async () => {
    renderPage();
    fireEvent.change(getTextbox('Supplier organization name'), { target: { value: '---' } });
    submitForm();
    await expectValidationMessage('Enter a supplier organization name that can generate a valid ID.');

    expect(screen.queryByText('Enter the supplier organization name.')).toBeNull();
  });

  it('14. reports only duplicate-name validation for the exact existing display name;', async () => {
    renderPage();
    fireEvent.change(getTextbox('Supplier organization name'), { target: { value: 'Baltic Freight' } });
    submitForm();
    await expectValidationMessage('A supplier organization with this name already exists.');

    expect(screen.queryByText('A supplier organization with this ID already exists.')).toBeNull();
  });

  it('15. reports only duplicate-name validation for a case-insensitive match;', async () => {
    renderPage();
    fireEvent.change(getTextbox('Supplier organization name'), { target: { value: 'BALTIC FREIGHT' } });
    submitForm();
    await expectValidationMessage('A supplier organization with this name already exists.');

    expect(screen.queryByText('A supplier organization with this ID already exists.')).toBeNull();
  });

  it('16. reports duplicate-name rather than duplicate-ID for a canonically equivalent name;', async () => {
    renderPage();
    fireEvent.change(getTextbox('Supplier organization name'), { target: { value: 'Baltic Freight'.normalize('NFD') } });
    submitForm();
    await expectValidationMessage('A supplier organization with this name already exists.');

    expect(screen.queryByText('A supplier organization with this ID already exists.')).toBeNull();
  });

  it('17. reports only duplicate-ID validation for a genuinely different name with the same ID;', async () => {
    renderPage();
    fireEvent.change(getTextbox('Supplier organization name'), { target: { value: 'baltic-freight' } });
    submitForm();
    await expectValidationMessage('A supplier organization with this ID already exists.');

    expect(screen.queryByText('A supplier organization with this name already exists.')).toBeNull();
  });

  it('18. reports only warehouse-selection validation for a valid unique name without warehouses;', async () => {
    renderPage();
    fireEvent.change(getTextbox('Supplier organization name'), { target: { value: 'Fresh Logistics Group' } });
    submitForm();
    await expectValidationMessage('Select at least one warehouse.');

    expect(screen.queryByText('Enter the supplier organization name.')).toBeNull();
    expect(screen.queryByText('A supplier organization with this name already exists.')).toBeNull();

    expect(
      getSchemaFailureMessages({ name: 'Fresh Logistics Group', warehouseAccess: ['not-a-real-warehouse'] }),
    ).toEqual(['Select at least one warehouse.']);

    expect(
      getSchemaFailureMessages({
        name: 'Fresh Logistics Group',
        warehouseAccess: ['nowy-kisielin-distribution-center', 'not-a-real-warehouse'],
      }),
    ).toEqual(['Select at least one warehouse.']);

    expect(
      getSchemaFailureMessages({
        name: 'Fresh Logistics Group',
        warehouseAccess: ['nowy-kisielin-distribution-center', 'nowy-kisielin-distribution-center'],
      }),
    ).toEqual(['Select at least one warehouse.']);
  });

  it('19. exposes the exact accessible warehouse options and their stable IDs;', () => {
    renderPage();

    expect(getCheckbox('Nowy Kisielin Distribution Center').value).toBe('nowy-kisielin-distribution-center');
    expect(getCheckbox('Zielona Góra Plant').value).toBe('zielona-gora-plant');
    expect(screen.getByText('nowy-kisielin-distribution-center').textContent).toBe('nowy-kisielin-distribution-center');
    expect(screen.getByText('zielona-gora-plant').textContent).toBe('zielona-gora-plant');
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  });

  it('20. a single warehouse selection updates the summary;', () => {
    renderPage();
    fireEvent.click(getCheckbox('Nowy Kisielin Distribution Center'));

    expectSummaryValue('Warehouse access', 'Nowy Kisielin Distribution Center');
  });

  it('21. two warehouse selections display in canonical demoWarehouses order regardless of click order;', () => {
    renderPage();
    fireEvent.click(getCheckbox('Zielona Góra Plant'));
    fireEvent.click(getCheckbox('Nowy Kisielin Distribution Center'));

    expectSummaryValue('Warehouse access', 'Nowy Kisielin Distribution Center, Zielona Góra Plant');

    const result = supplierOrganizationSchema.safeParse({
      name: 'Fresh Logistics Group',
      warehouseAccess: ['zielona-gora-plant', 'nowy-kisielin-distribution-center'],
    });
    if (!result.success) {
      throw new Error('Expected supplierOrganizationSchema.safeParse to succeed for this input.');
    }
    expect(result.data.warehouseAccess).toEqual(['nowy-kisielin-distribution-center', 'zielona-gora-plant']);
  });

  it('22. deselecting a warehouse updates the summary;', () => {
    renderPage();
    fireEvent.click(getCheckbox('Nowy Kisielin Distribution Center'));
    fireEvent.click(getCheckbox('Zielona Góra Plant'));
    fireEvent.click(getCheckbox('Nowy Kisielin Distribution Center'));

    expectSummaryValue('Warehouse access', 'Zielona Góra Plant');
  });

  it('23. submits valid data and shows the exact success heading, copy and demo notice;', async () => {
    const { container } = renderPage();
    await submitValidOrganization();

    expect(screen.getByText('The supplier organization details were validated successfully.').textContent)
      .toBe('The supplier organization details were validated successfully.');
    expect(screen.getByText('Demo mode: no supplier organization was created and no data was saved.').textContent)
      .toBe('Demo mode: no supplier organization was created and no data was saved.');

    const heading = screen.getByRole('heading', { name: 'Supplier organization prepared', level: 1 });
    expect(heading.textContent).toBe('Supplier organization prepared');

    const successRegion = screen.getByRole('region');
    const backLinks = screen.getAllByRole('link', { name: 'Back to supplier organizations' });
    expect(backLinks).toHaveLength(2);
    backLinks.forEach((link) => {
      expect(link.textContent).toBe('Back to supplier organizations');
    });

    const backLinkOutsideRegion = backLinks.find((link) => !successRegion.contains(link));
    if (!backLinkOutsideRegion) {
      throw new Error('Expected a Back to supplier organizations link outside the success region.');
    }
    const backLinkIcon = getIcon(backLinkOutsideRegion);
    expect(backLinkIcon.getAttribute('aria-hidden')).toBe('true');

    const prepareAnotherButton = screen.getByRole('button', { name: 'Prepare another organization' });
    expect(prepareAnotherButton.textContent).toBe('Prepare another organization');

    const successRegionIcons = successRegion.querySelectorAll('svg');
    expect(successRegionIcons).toHaveLength(2);
    successRegionIcons.forEach((icon) => {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });

    const allSuccessPageIcons = container.querySelectorAll('svg');
    expect(allSuccessPageIcons).toHaveLength(3);
    allSuccessPageIcons.forEach((icon) => {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('24. shows the normalized name, generated ID and selected warehouse names in the success details;', async () => {
    renderPage();
    await submitValidOrganization('  Fresh Logistics Group  ', ['Zielona Góra Plant', 'Nowy Kisielin Distribution Center']);

    expect(screen.getByText('Fresh Logistics Group').textContent).toBe('Fresh Logistics Group');
    expect(screen.getByText('fresh-logistics-group').textContent).toBe('fresh-logistics-group');
    expect(screen.getByText('Nowy Kisielin Distribution Center, Zielona Góra Plant').textContent)
      .toBe('Nowy Kisielin Distribution Center, Zielona Góra Plant');
  });

  it('25. does not mutate the centralized supplier organization catalogue or assignments;', async () => {
    const originalOrganizations = [...demoSupplierOrganizations];
    const originalAssignments = JSON.parse(JSON.stringify(demoSupplierAssignments));
    renderPage();
    await submitValidOrganization();

    expect(demoSupplierOrganizations).toEqual(originalOrganizations);
    expect(demoSupplierAssignments).toEqual(originalAssignments);
  });

  it('26. performs no network request or storage write;', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    renderPage();
    await submitValidOrganization();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });

  it('27. does not navigate away after a successful submit;', async () => {
    renderPage();
    await submitValidOrganization();

    expect(screen.queryByText('Supplier Organizations Page Mock')).toBeNull();
  });

  it('28. Prepare another organization clears values and restores the initial summary;', async () => {
    renderPage();
    await submitValidOrganization();
    fireEvent.click(screen.getByRole('button', { name: 'Prepare another organization' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Add supplier organization', level: 1 }).textContent)
        .toBe('Add supplier organization');
    });
    expect(getTextbox('Supplier organization name').value).toBe('');
    expect(getTextbox('Organization ID').value).toBe('');
    expect(getCheckbox('Nowy Kisielin Distribution Center').checked).toBe(false);
    expectSummaryValue('Supplier organization name', 'Not selected');
    expectSummaryValue('Organization ID', 'Not generated');
    expectSummaryValue('Warehouse access', 'Not selected');
  });

  it('29. Prepare another organization clears prior validation errors;', async () => {
    renderPage();
    submitForm();
    await expectValidationMessage('Enter the supplier organization name.');
    await submitValidOrganization();
    fireEvent.click(screen.getByRole('button', { name: 'Prepare another organization' }));

    const nameInput = getTextbox('Supplier organization name');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(nameInput.getAttribute('aria-invalid')).toBe('false');
    expect(nameInput.getAttribute('aria-describedby')).toBeNull();
  });

  it('30. links the warehouse-selection error via ARIA, announces success politely, and navigates back from the success state;', async () => {
    renderPage();
    fireEvent.change(getTextbox('Supplier organization name'), { target: { value: 'Fresh Logistics Group' } });
    submitForm();
    await expectValidationMessage('Select at least one warehouse.');

    const alert = screen.getByRole('alert');
    expect(alert.id).toBe('warehouse-access-error');

    const legend = screen.getByText('Warehouse access', { selector: 'legend' });
    const fieldset = legend.closest('fieldset');
    if (!fieldset) {
      throw new Error('Expected the legend to be inside a fieldset.');
    }
    expect(fieldset.getAttribute('aria-describedby')).toBe('warehouse-access-error');

    fireEvent.click(getCheckbox('Nowy Kisielin Distribution Center'));
    submitForm();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Supplier organization prepared', level: 1 }).textContent)
        .toBe('Supplier organization prepared');
    });

    const successRegion = screen.getByRole('region');
    expect(successRegion.getAttribute('aria-live')).toBe('polite');

    fireEvent.click(within(successRegion).getByRole('link', { name: 'Back to supplier organizations' }));
    expect(screen.getByText('Supplier Organizations Page Mock').textContent).toBe('Supplier Organizations Page Mock');
  });
});
