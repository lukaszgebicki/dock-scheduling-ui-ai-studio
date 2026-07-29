import { describe, expect, it } from 'vitest';
import { demoAppointments } from '../appointments/demoAppointments';
import {
  addWarehouseDraft,
  approvalConditions,
  createBlockId,
  createCapacityPoolId,
  createDockId,
  createWarehouseDraftConfiguration,
  deriveAvailabilityContract,
  deriveSupplierBookingContract,
  deriveSupplierFormContract,
  evaluateApproval,
  getSupplierConfiguration,
  getWarehouseConfiguration,
  initialDemoConfiguration,
  publishSupplierConfiguration,
  publishWarehouseConfiguration,
  type DemoConfigurationState,
  type ApprovalRequest,
} from './configuration';
import { asWarehouseId, getDemoActor } from './demoDomain';

function freshState(): DemoConfigurationState {
  return structuredClone(initialDemoConfiguration);
}

describe('administration configuration contract', () => {
  it('provides canonical published configuration for every existing warehouse and supplier', () => {
    const state = freshState();

    expect(state.warehouses.map((warehouse) => warehouse.id)).toEqual([
      'nowy-kisielin-distribution-center',
      'zielona-gora-plant',
    ]);
    expect(state.warehouses.every((warehouse) => warehouse.status === 'published')).toBe(true);
    expect(state.suppliers.map((supplier) => supplier.organizationId)).toEqual([
      'northstar-packaging',
      'baltic-freight',
      'vistula-materials',
    ]);
    expect(state.criticalRuleCatalog).toContain('adr');
  });

  it('creates a stable local warehouse draft and records the System Administrator actor', () => {
    const state = freshState();
    const id = asWarehouseId('poznan-cross-dock');
    const next = addWarehouseDraft(
      state,
      createWarehouseDraftConfiguration(id, 'Poznan Cross Dock'),
      getDemoActor('system-administrator'),
    );

    expect(getWarehouseConfiguration(next, id)).toMatchObject({
      id: 'poznan-cross-dock',
      displayName: 'Poznan Cross Dock',
      status: 'draft',
    });
    expect(next.history).toEqual([
      expect.objectContaining({
        id: 'configuration-history-001',
        actorId: 'system-administrator',
        targetId: 'poznan-cross-dock',
        changeType: 'warehouse-draft-created',
      }),
    ]);
    expect(state.warehouses).toHaveLength(2);
  });

  it('rejects malformed branded configuration IDs', () => {
    expect(() => createDockId('invalid-')).toThrow('Invalid dock ID');
    expect(() => createCapacityPoolId('Main capacity')).toThrow('Invalid capacity pool ID');
    expect(() => createBlockId('')).toThrow('Invalid block ID');
  });

  it('rejects warehouse creation by a non-System Administrator', () => {
    const id = asWarehouseId('poznan-cross-dock');

    expect(() => addWarehouseDraft(
      freshState(),
      createWarehouseDraftConfiguration(id, 'Poznan Cross Dock'),
      getDemoActor('warehouse-administrator'),
    )).toThrow('Only System Administrator');
  });

  it('publishes a created warehouse with an administrator assignment and audited block', () => {
    const id = asWarehouseId('poznan-cross-dock');
    const actor = getDemoActor('system-administrator');
    const state = addWarehouseDraft(
      freshState(),
      createWarehouseDraftConfiguration(id, 'Poznan Cross Dock'),
      actor,
    );
    const draft = getWarehouseConfiguration(state, id);
    if (!draft) throw new Error('Expected warehouse draft.');
    const published = publishWarehouseConfiguration(state, {
      ...draft,
      administratorUserIds: ['u-2'],
      blocks: [{
        id: createBlockId('poznan-maintenance-1'),
        reasonType: 'Maintenance',
        reason: 'Dock leveller inspection',
        scope: { type: 'warehouse' },
        schedule: {
          kind: 'one-time',
          date: '2026-07-28',
          allDay: false,
          startsAt: '08:00',
          endsAt: '09:00',
        },
      }],
    }, actor);

    expect(getWarehouseConfiguration(published, id)?.status).toBe('published');
    expect(published.history.map((entry) => entry.changeType)).toEqual([
      'warehouse-draft-created',
      'warehouse-administrator-assignment-changed',
      'warehouse-block-created',
      'warehouse-configuration-published',
    ]);
    expect(published.history[2]).toMatchObject({
      reason: 'Dock leveller inspection',
      actorId: 'system-administrator',
    });
  });

  it('requires a reason for every configured exception', () => {
    const state = freshState();
    const warehouse = state.warehouses[0];

    expect(() => publishWarehouseConfiguration(state, {
      ...warehouse,
      blocks: [{
        id: createBlockId('invalid-block'),
        reasonType: 'Manual Block',
        reason: ' ',
        scope: { type: 'warehouse' },
        schedule: {
          kind: 'one-time',
          date: '2026-07-28',
          allDay: true,
          startsAt: '00:00',
          endsAt: '23:59',
        },
      }],
    }, getDemoActor('system-administrator'))).toThrow('Every block requires a reason.');
  });

  it('rejects invalid working hours and block schedules', () => {
    const state = freshState();
    const warehouse = state.warehouses[0];
    expect(() => publishWarehouseConfiguration(state, {
      ...warehouse,
      workingDays: warehouse.workingDays.map((day) =>
        day.weekday === 2 ? { ...day, opensAt: '18:00', closesAt: '06:00' } : day),
    }, getDemoActor('system-administrator'))).toThrow('valid opening interval');

    expect(() => publishWarehouseConfiguration(state, {
      ...warehouse,
      blocks: [{
        id: createBlockId('invalid-schedule'),
        reasonType: 'Maintenance',
        reason: 'Invalid interval',
        scope: { type: 'warehouse' },
        schedule: {
          kind: 'one-time',
          date: '',
          allDay: false,
          startsAt: '10:00',
          endsAt: '09:00',
        },
      }],
    }, getDemoActor('system-administrator'))).toThrow('valid date or time interval');
  });

  it('prevents a Warehouse Administrator from changing administrator assignments', () => {
    const state = freshState();
    const warehouse = state.warehouses[0];

    expect(() => publishWarehouseConfiguration(state, {
      ...warehouse,
      administratorUserIds: ['u-1'],
    }, getDemoActor('warehouse-administrator'))).toThrow(
      'Only System Administrator can change Warehouse Administrator assignments.',
    );
  });

  it('derives working-hour, active-dock and capacity availability without reserving a slot', () => {
    const state = freshState();

    expect(deriveAvailabilityContract(state, {
      warehouseId: 'nowy-kisielin-distribution-center',
      date: '2026-07-28',
      time: '08:00',
    })).toMatchObject({
      available: true,
      configuredCapacity: 4,
      reasons: [],
    });
    expect(deriveAvailabilityContract(state, {
      warehouseId: 'nowy-kisielin-distribution-center',
      date: '2026-07-28',
      time: '23:00',
    })).toMatchObject({
      available: false,
      reasons: ['Outside configured working hours.'],
    });
  });

  it('makes published hours, capacity and required-field changes visible to later consumers', () => {
    const state = freshState();
    const warehouse = state.warehouses[0];
    const configured = publishWarehouseConfiguration(state, {
      ...warehouse,
      workingDays: warehouse.workingDays.map((day) =>
        day.weekday === 2 ? { ...day, closesAt: '07:00' } : day),
      capacityPools: warehouse.capacityPools.map((pool) => ({
        ...pool,
        concurrentVehicles: 2,
      })),
      requiredFields: {
        ...warehouse.requiredFields,
        'Material Delivery': ['purchase-order', 'asn', 'vehicle-registration'],
      },
    }, getDemoActor('system-administrator'));

    expect(deriveAvailabilityContract(configured, {
      warehouseId: warehouse.id,
      date: '2026-07-28',
      time: '08:00',
    })).toMatchObject({
      available: false,
      configuredCapacity: 2,
      reasons: ['Outside configured working hours.'],
    });
    expect(deriveSupplierFormContract(
      configured,
      warehouse.id,
      'Material Delivery',
    ).requiredFields).toContain('asn');
  });

  it('keeps warehouse and supplier assignment views synchronized and audited', () => {
    const state = freshState();
    const warehouse = state.warehouses[0];
    const configured = publishWarehouseConfiguration(state, {
      ...warehouse,
      supplierOrganizationIds: warehouse.supplierOrganizationIds.filter((id) =>
        id !== 'northstar-packaging'),
    }, getDemoActor('system-administrator'));

    expect(getSupplierConfiguration(configured, 'northstar-packaging')?.warehouseIds).toEqual([]);
    expect(configured.history).toEqual([
      expect.objectContaining({
        targetId: 'northstar-packaging',
        changeType: 'supplier-warehouse-assignment-changed',
      }),
      expect.objectContaining({ changeType: 'warehouse-configuration-published' }),
    ]);
  });

  it('blocks new availability and reports existing conflicts without cancelling appointments', () => {
    const state = freshState();
    const warehouse = state.warehouses[0];
    const configured = publishWarehouseConfiguration(state, {
      ...warehouse,
      blocks: [{
        id: createBlockId('nowy-kisielin-maintenance'),
        reasonType: 'Maintenance',
        reason: 'Planned maintenance',
        scope: { type: 'warehouse' },
        schedule: {
          kind: 'one-time',
          date: '2026-07-28',
          allDay: false,
          startsAt: '07:30',
          endsAt: '12:00',
        },
      }],
    }, getDemoActor('system-administrator'));

    const contract = deriveAvailabilityContract(configured, {
      warehouseId: 'nowy-kisielin-distribution-center',
      date: '2026-07-28',
      time: '08:00',
      appointments: demoAppointments,
    });

    expect(contract.available).toBe(false);
    expect(contract.reasons).toContain('A configured block affects this time.');
    expect(contract.calendarConflictAppointmentIds).toEqual([
      'appointment-001',
      'appointment-003',
    ]);
    expect(demoAppointments.find((appointment) => appointment.id === 'appointment-001')?.status)
      .toBe('Confirmed');
  });

  it('reports scoped block conflicts only for appointments with the matching resource scope', () => {
    const state = freshState();
    const warehouse = state.warehouses[0];
    const dockId = warehouse.docks[0].id;
    const configured = publishWarehouseConfiguration(state, {
      ...warehouse,
      blocks: [{
        id: createBlockId('scoped-dock-block'),
        reasonType: 'Maintenance',
        reason: 'Dock maintenance',
        scope: { type: 'dock', dockId },
        schedule: {
          kind: 'one-time',
          date: '2026-07-28',
          allDay: false,
          startsAt: '07:30',
          endsAt: '12:00',
        },
      }],
    }, getDemoActor('system-administrator'));

    const contract = deriveAvailabilityContract(configured, {
      warehouseId: warehouse.id,
      date: '2026-07-28',
      time: '08:00',
      dockId,
      appointments: [
        {
          id: 'matching-dock',
          warehouseId: warehouse.id,
          plannedDate: '2026-07-28',
          plannedTime: '11:00',
          status: 'Confirmed',
          dockId,
        },
        {
          id: 'unknown-dock',
          warehouseId: warehouse.id,
          plannedDate: '2026-07-28',
          plannedTime: '09:00',
          status: 'Confirmed',
        },
      ],
    });

    expect(contract.calendarConflictAppointmentIds).toEqual(['matching-dock']);
  });

  it('exposes configured Material Delivery fields and cut-off to a later supplier form', () => {
    const state = freshState();

    expect(deriveSupplierFormContract(
      state,
      'nowy-kisielin-distribution-center',
      'Material Delivery',
    )).toEqual({
      requiredFields: ['purchase-order', 'vehicle-registration'],
      cutOffHours: 12,
    });
  });

  it('removes a disabled warehouse flow from supplier form and booking contracts', () => {
    const state = freshState();
    const warehouse = state.warehouses[0];
    const configured = publishWarehouseConfiguration(state, {
      ...warehouse,
      availableFlows: ['Finished Goods Pickup'],
    }, getDemoActor('system-administrator'));

    expect(deriveSupplierFormContract(
      configured,
      warehouse.id,
      'Material Delivery',
    )).toEqual({ requiredFields: [], cutOffHours: 0 });
    expect(deriveSupplierBookingContract(configured, 'northstar-packaging').allowedFlows)
      .toEqual(['Finished Goods Pickup']);
    expect(evaluateApproval(configured, {
      warehouseId: warehouse.id,
      supplierOrganizationId: 'northstar-packaging',
      flow: 'Material Delivery',
      isAdr: false,
    })).toBe('manual');
  });

  it('resolves standard delivery to auto and ADR to manual under rule-based approval', () => {
    const state = freshState();
    const baseRequest = {
      warehouseId: 'nowy-kisielin-distribution-center' as const,
      supplierOrganizationId: 'northstar-packaging' as const,
      flow: 'Material Delivery' as const,
    };

    expect(evaluateApproval(state, { ...baseRequest, isAdr: false })).toBe('auto');
    expect(evaluateApproval(state, { ...baseRequest, isAdr: true })).toBe('manual');
  });

  it.each([
    ['delivery-type', { deliveryTypeRequiresApproval: true }],
    ['supplier', { supplierRequiresApproval: true }],
    ['new-or-blocked-supplier', { isNewSupplier: true }],
    ['adr', { isAdr: true }],
    ['controlled-temperature', { isControlledTemperature: true }],
    ['missing-document', { hasRequiredDocument: false }],
    ['after-cut-off', { afterCutOff: true }],
    ['volume-over-limit', { volumeOverLimit: true }],
    ['special-vehicle', { specialVehicle: true }],
    ['missing-purchase-order', { hasPurchaseOrder: false }],
    ['capacity-override', { capacityOverride: true }],
    ['unannounced-visit', { unannouncedVisit: true }],
  ] as const)('evaluates the %s approval condition', (condition, matchingInput) => {
    const state = freshState();
    const warehouse = state.warehouses[0];
    const configured = publishWarehouseConfiguration(state, {
      ...warehouse,
      activeCriticalRules: [condition],
    }, getDemoActor('system-administrator'), approvalConditions);
    const request: ApprovalRequest = {
      warehouseId: warehouse.id,
      supplierOrganizationId: 'northstar-packaging',
      flow: 'Material Delivery',
      isAdr: false,
      ...matchingInput,
    };

    expect(evaluateApproval(configured, request)).toBe('manual');
  });

  it('requires an explicit reasoned override before a supplier can weaken a critical rule', () => {
    const state = freshState();
    const supplier = getSupplierConfiguration(state, 'northstar-packaging');
    if (!supplier) throw new Error('Expected supplier configuration.');

    expect(() => publishSupplierConfiguration(state, {
      ...supplier,
      approvalMode: 'auto',
    }, getDemoActor('system-administrator'))).toThrow(
      'Auto approval requires an explicit override',
    );

    const next = publishSupplierConfiguration(state, {
      ...supplier,
      approvalMode: 'auto',
      criticalRuleOverrides: [{
        condition: 'adr',
        reason: 'Approved ADR carrier controls',
      }],
    }, getDemoActor('system-administrator'));

    expect(evaluateApproval(next, {
      warehouseId: 'nowy-kisielin-distribution-center',
      supplierOrganizationId: 'northstar-packaging',
      flow: 'Material Delivery',
      isAdr: true,
    })).toBe('auto');
    expect(next.history).toEqual([
      expect.objectContaining({ changeType: 'supplier-configuration-published' }),
      expect.objectContaining({
        changeType: 'critical-rule-override-authorized',
        reason: 'Approved ADR carrier controls',
      }),
    ]);
  });

  it('keeps supplier publishing System Administrator-only', () => {
    const state = freshState();
    const supplier = getSupplierConfiguration(state, 'northstar-packaging');
    if (!supplier) throw new Error('Expected supplier configuration.');

    expect(() => publishSupplierConfiguration(
      state,
      supplier,
      getDemoActor('warehouse-administrator'),
    )).toThrow('Only System Administrator');
  });

  it('exposes assigned warehouses, allowed flows and blocked status to later booking consumers', () => {
    const state = freshState();
    const supplier = getSupplierConfiguration(state, 'northstar-packaging');
    if (!supplier) throw new Error('Expected supplier configuration.');
    const blocked = publishSupplierConfiguration(state, {
      ...supplier,
      status: 'blocked',
      allowedFlows: ['Material Delivery'],
    }, getDemoActor('system-administrator'));

    expect(deriveSupplierBookingContract(blocked, 'northstar-packaging')).toEqual({
      canBook: false,
      canReschedule: false,
      message: 'This supplier organization is blocked. Administrator decision is required.',
      warehouseIds: ['nowy-kisielin-distribution-center'],
      allowedFlows: ['Material Delivery'],
      warehouseFlowAssignments: [{
        warehouseId: 'nowy-kisielin-distribution-center',
        allowedFlows: ['Material Delivery'],
      }],
    });
  });

  it('prevents booking when no assigned warehouse accepts a supplier flow', () => {
    const state = freshState();
    const warehouse = state.warehouses[0];
    const configured = publishWarehouseConfiguration(state, {
      ...warehouse,
      availableFlows: [],
    }, getDemoActor('system-administrator'));

    expect(deriveSupplierBookingContract(configured, 'northstar-packaging')).toEqual({
      canBook: false,
      canReschedule: false,
      message: 'No assigned warehouse accepts an allowed supplier flow.',
      warehouseIds: [warehouse.id],
      allowedFlows: [],
      warehouseFlowAssignments: [{
        warehouseId: warehouse.id,
        allowedFlows: [],
      }],
    });
  });
});
