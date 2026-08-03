import { describe, expect, it } from 'vitest';
import { initialDemoConfiguration } from '../demoDomain/configuration';
import { getDemoActor } from '../demoDomain/demoDomain';
import {
  addWorkspaceComment,
  columnsForActor,
  createInitialAppointmentWorkspaceState,
  emptyWorkspaceFilters,
  filterWorkspaceRecords,
  saveWorkspaceView,
  setDefaultWorkspaceView,
  skuTotals,
  transportReconciliation,
  updateWorkspaceField,
  visibleChangeHistory,
  visibleComments,
  type AppointmentWorkspaceState,
  type WorkspaceFilters,
} from './appointmentWorkspace';

function record(
  state: AppointmentWorkspaceState,
  id: string,
) {
  return state.records.find((candidate) => candidate.id === id)!;
}

function warehouse(id: string) {
  return initialDemoConfiguration.warehouses.find((candidate) => candidate.id === id)!;
}

function withImportedConflict(
  state: AppointmentWorkspaceState,
  recordId: string,
): AppointmentWorkspaceState {
  return {
    ...state,
    records: state.records.map((candidate) => candidate.id === recordId
      ? {
          ...candidate,
          importedTransportDetails: {
            tractorRegistration: 'TR-IMPORT-999',
            trailerOrContainerRegistration:
              candidate.supplierTransportDetails.trailerOrContainerRegistration,
          },
        }
      : candidate),
  };
}

describe('appointment workspace domain', () => {
  it('projects one PO header per record and aggregates SKU lines exactly once', () => {
    const state = createInitialAppointmentWorkspaceState();
    expect(state.records).toHaveLength(4);
    const baltic = record(state, 'planning-baltic-2001');
    expect(baltic.purchaseOrderNumber).toBe('PO-DEMO-2001');
    expect(skuTotals(baltic)).toEqual({
      lineCount: 3,
      units: 2100,
      pallets: 4.25,
    });
    expect(state.records.filter((candidate) => candidate.id === baltic.id)).toHaveLength(1);
  });

  it('does not fabricate status history or transport conflicts', () => {
    const state = createInitialAppointmentWorkspaceState();
    for (const candidate of state.records) {
      expect(candidate.statusHistory).toHaveLength(0);
      expect(candidate.importedTransportDetails).toEqual({});
      expect(transportReconciliation(candidate).requiresDecision).toBe(false);
    }
  });

  it('keeps missing SKU detail explicit instead of fabricating zero totals', () => {
    const northstar = record(
      createInitialAppointmentWorkspaceState(),
      'planning-northstar-1001',
    );
    expect(northstar.skuLines).toHaveLength(0);
    expect(skuTotals(northstar)).toBeNull();
    expect(northstar.requiredAction).toBe('Awaiting SKU details');
  });

  it('returns role-specific columns without Supplier or diagnostics leakage', () => {
    const supplier = getDemoActor('supplier-user');
    const security = getDemoActor('security-officer');
    const system = getDemoActor('system-administrator');
    expect(columnsForActor(supplier)).not.toContain('supplier');
    expect(columnsForActor(supplier)).not.toContain('planningState');
    expect(columnsForActor(security)).not.toContain('bookingOrigin');
    expect(columnsForActor(system)).toContain('planningState');
    expect(columnsForActor(system)).toContain('skuSummary');
  });

  it('searches only approved visible fields and never hidden diagnostic data', () => {
    const supplier = getDemoActor('supplier-user');
    const state = createInitialAppointmentWorkspaceState();
    const scoped = state.records
      .filter((candidate) => candidate.supplierOrganizationId === 'vistula-materials')
      .map((candidate) => ({
        ...candidate,
        internalPlanningNote: 'SECRET-HIDDEN-TERM',
        importDiagnostic: 'HIDDEN-DIAGNOSTIC',
        batchLineage: 'HIDDEN-BATCH',
      }));

    expect(filterWorkspaceRecords(
      scoped,
      supplier,
      emptyWorkspaceFilters,
      'SECRET-HIDDEN-TERM',
    )).toHaveLength(0);
    expect(filterWorkspaceRecords(
      scoped,
      supplier,
      emptyWorkspaceFilters,
      'PO-DEMO-3001',
    ).map((candidate) => candidate.id)).toEqual(['planning-vistula-3001']);
  });

  it('applies all filter families with deterministic AND semantics', () => {
    const actor = getDemoActor('system-administrator');
    const state = createInitialAppointmentWorkspaceState();
    const filters: WorkspaceFilters = {
      ...emptyWorkspaceFilters,
      lifecycleStatus: 'CONFIRMED',
      plannedDateFrom: '2026-08-11',
      plannedDateTo: '2026-08-11',
      warehouseId: 'zielona-gora-plant',
      supplierOrganizationId: 'baltic-freight',
      deliveryType: 'Material Delivery',
      planningState: 'READY',
      bookingOrigin: 'ADMIN_ADDED',
      actionRequired: 'none',
      completion: 'active',
      missingDetailsOnly: false,
    };
    expect(filterWorkspaceRecords(state.records, actor, filters, 'ASN-DEMO-2001')
      .map((candidate) => candidate.id)).toEqual(['planning-baltic-2001']);

    expect(filterWorkspaceRecords(
      state.records,
      actor,
      { ...emptyWorkspaceFilters, missingDetailsOnly: true },
      '',
    ).map((candidate) => candidate.id)).toEqual([
      'planning-northstar-1001',
      'appointment-nonweekly-vistula-001',
    ]);
  });

  it('filters cancelled and completed states without changing source records', () => {
    const actor = getDemoActor('system-administrator');
    const initial = createInitialAppointmentWorkspaceState();
    const records = initial.records.map((candidate, index) => index === 0
      ? { ...candidate, lifecycleStatus: 'CANCELLED' as const }
      : index === 1
        ? { ...candidate, operationalStatus: 'COMPLETED' as const }
        : candidate);
    expect(filterWorkspaceRecords(
      records,
      actor,
      { ...emptyWorkspaceFilters, completion: 'cancelled' },
      '',
    )).toHaveLength(1);
    expect(filterWorkspaceRecords(
      records,
      actor,
      { ...emptyWorkspaceFilters, completion: 'completed' },
      '',
    )).toHaveLength(1);
    expect(initial.records[0].lifecycleStatus).not.toBe('CANCELLED');
  });

  it('creates actor-owned local saved views, blocks duplicates and changes default explicitly', () => {
    const actor = getDemoActor('system-administrator');
    const first = saveWorkspaceView(
      [],
      actor,
      'Needs action',
      { ...emptyWorkspaceFilters, actionRequired: 'required' },
      columnsForActor(actor),
    );
    expect(first.error).toBeNull();
    expect(first.savedView?.isDefault).toBe(true);

    const duplicate = saveWorkspaceView(
      first.views,
      actor,
      ' needs ACTION ',
      emptyWorkspaceFilters,
      columnsForActor(actor),
    );
    expect(duplicate.error).toContain('already exists');
    expect(duplicate.views).toBe(first.views);

    const second = saveWorkspaceView(
      first.views,
      actor,
      'Baltic',
      { ...emptyWorkspaceFilters, supplierOrganizationId: 'baltic-freight' },
      columnsForActor(actor),
    );
    const changed = setDefaultWorkspaceView(
      second.views,
      actor,
      second.savedView!.id,
    );
    expect(changed.error).toBeNull();
    expect(changed.views.filter((view) => view.isDefault)).toHaveLength(1);
    expect(changed.savedView?.name).toBe('Baltic');
  });

  it('sanitizes saved-view columns against the active actor', () => {
    const supplier = getDemoActor('supplier-user');
    const result = saveWorkspaceView(
      [],
      supplier,
      'Supplier safe',
      emptyWorkspaceFilters,
      ['appointment', 'supplier', 'planningState', 'purchaseOrder'],
    );
    expect(result.error).toBeNull();
    expect(result.savedView?.columns).toEqual(['appointment', 'purchaseOrder']);
  });

  it('requires explicit comment visibility and hides Internal Notes from Supplier actors', () => {
    const internal = getDemoActor('system-administrator');
    const supplier = getDemoActor('supplier-user');
    const initial = createInitialAppointmentWorkspaceState();
    const missingVisibility = addWorkspaceComment(
      initial,
      'planning-vistula-3001',
      internal,
      true,
      '',
      'Internal review',
      'Reason',
    );
    expect(missingVisibility.error).toContain('visibility');
    expect(missingVisibility.state).toBe(initial);

    const internalNote = addWorkspaceComment(
      initial,
      'planning-vistula-3001',
      internal,
      true,
      'INTERNAL_NOTE',
      'Internal review',
      'Planning review',
    );
    expect(internalNote.error).toBeNull();
    const updated = record(internalNote.state, 'planning-vistula-3001');
    expect(visibleComments(updated, internal)).toHaveLength(1);
    expect(visibleComments(updated, supplier)).toHaveLength(0);
    expect(visibleChangeHistory(updated, supplier)).toHaveLength(0);
  });

  it('allows Supplier-safe transport correction on its own EXPECTED record with immutable history', () => {
    const supplier = getDemoActor('supplier-user');
    const initial = createInitialAppointmentWorkspaceState();
    const target = record(initial, 'appointment-nonweekly-vistula-001');
    const result = updateWorkspaceField(
      initial,
      target.id,
      supplier,
      true,
      warehouse(target.warehouseId),
      'tractorRegistration',
      'TR-NW-101',
      'Correct vehicle registration',
    );
    expect(result.error).toBeNull();
    const updated = record(result.state, target.id);
    expect(updated.supplierTransportDetails.tractorRegistration).toBe('TR-NW-101');
    expect(updated.supplierTransportDetails.trailerOrContainerRegistration).toBe('TRL-NW-200');
    expect(updated.changeHistory[0]).toMatchObject({
      action: 'SAFE_EDIT',
      actorId: supplier.id,
      before: 'TR-NW-100',
      after: 'TR-NW-101',
      externalVisible: true,
    });
    expect(visibleChangeHistory(updated, supplier)).toHaveLength(1);
    expect(initial.records).not.toBe(result.state.records);
  });

  it('uses Administrator transport authority only for explicit imported reconciliation evidence', () => {
    const system = getDemoActor('system-administrator');
    const initial = withImportedConflict(
      createInitialAppointmentWorkspaceState(),
      'planning-baltic-2001',
    );
    const target = record(initial, 'planning-baltic-2001');
    expect(transportReconciliation(target).requiresDecision).toBe(true);
    const result = updateWorkspaceField(
      initial,
      target.id,
      system,
      true,
      warehouse(target.warehouseId),
      'tractorRegistration',
      'TR-IMPORT-999',
      'Administrator accepts verified registration',
    );
    expect(result.error).toBeNull();
    const updated = record(result.state, target.id);
    expect(updated.importedTransportDetails.tractorRegistration).toBe('TR-IMPORT-999');
    expect(updated.supplierTransportDetails.tractorRegistration).toBe('TR-IMPORT-999');
    expect(transportReconciliation(updated).requiresDecision).toBe(false);
  });

  it('keeps internal safe-edit history hidden from Supplier actors', () => {
    const internal = getDemoActor('system-administrator');
    const supplier = getDemoActor('supplier-user');
    const initial = createInitialAppointmentWorkspaceState();
    const target = record(initial, 'planning-vistula-3001');
    const result = updateWorkspaceField(
      initial,
      target.id,
      internal,
      true,
      warehouse(target.warehouseId),
      'contactName',
      'Internal Contact',
      'Internal correction',
    );
    expect(result.error).toBeNull();
    const updated = record(result.state, target.id);
    expect(updated.changeHistory[0].externalVisible).toBe(false);
    expect(visibleChangeHistory(updated, supplier)).toHaveLength(0);
  });

  it('blocks Warehouse Operator transport authority and editing at or after CHECKED_IN', () => {
    const operator = getDemoActor('warehouse-operator');
    const initial = createInitialAppointmentWorkspaceState();
    const baltic = record(initial, 'planning-baltic-2001');
    const transport = updateWorkspaceField(
      initial,
      baltic.id,
      operator,
      true,
      warehouse(baltic.warehouseId),
      'tractorRegistration',
      'TR-OPERATOR',
      'Operator attempt',
    );
    expect(transport.error).toContain('cannot edit');
    expect(transport.state).toBe(initial);

    const checkedInState: AppointmentWorkspaceState = {
      ...initial,
      records: initial.records.map((candidate) => candidate.id === baltic.id
        ? { ...candidate, operationalStatus: 'CHECKED_IN' }
        : candidate),
    };
    const contact = updateWorkspaceField(
      checkedInState,
      baltic.id,
      operator,
      true,
      warehouse(baltic.warehouseId),
      'contactName',
      'New Contact',
      'Late attempt',
    );
    expect(contact.error).toContain('at or after CHECKED_IN');
    expect(record(contact.state, baltic.id).changeHistory).toHaveLength(0);
  });

  it('fails closed for out-of-scope, empty, unchanged and missing-reason edits', () => {
    const supplier = getDemoActor('supplier-user');
    const initial = createInitialAppointmentWorkspaceState();
    const target = record(initial, 'appointment-nonweekly-vistula-001');
    for (const result of [
      updateWorkspaceField(initial, target.id, supplier, false, warehouse(target.warehouseId), 'phone', '123', 'Reason'),
      updateWorkspaceField(initial, target.id, supplier, true, warehouse(target.warehouseId), 'phone', '', 'Reason'),
      updateWorkspaceField(initial, target.id, supplier, true, warehouse(target.warehouseId), 'tractorRegistration', 'TR-NW-100', 'Reason'),
      updateWorkspaceField(initial, target.id, supplier, true, warehouse(target.warehouseId), 'phone', '123', ''),
    ]) {
      expect(result.error).not.toBeNull();
      expect(result.state).toBe(initial);
    }
  });
});
