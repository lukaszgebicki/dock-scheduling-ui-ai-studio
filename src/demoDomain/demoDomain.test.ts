import { describe, expect, it } from 'vitest';
import { demoAppointments } from '../appointments/demoAppointments';
import {
  canAccessRoute,
  canPerformAction,
  canViewAppointment,
  canViewSupplierOrganization,
  canViewUser,
  canViewWarehouse,
  demoActors,
  demoSupplierOrganizations,
  demoUsers,
  demoWarehouses,
  uiMvpRoles,
  type DemoAction,
  type DemoRoute,
} from './demoDomain';

const routes: readonly DemoRoute[] = [
  '/appointments',
  '/users',
  '/warehouses',
  '/supplier-organizations',
];

const actions: readonly DemoAction[] = [
  'invite-user',
  'add-warehouse',
  'add-supplier-organization',
  'configure-warehouse',
  'configure-supplier-organization',
];

describe('demo domain contract', () => {
  it('defines exactly the six approved roles and one canonical actor per role', () => {
    expect(uiMvpRoles).toEqual([
      'System Administrator',
      'Warehouse Administrator',
      'Warehouse Operator',
      'Security Officer',
      'Supplier Administrator',
      'Supplier User',
    ]);
    expect(demoActors).toEqual([
      {
        id: 'system-administrator',
        userId: 'u-1',
        displayName: 'Demo Administrator',
        role: 'System Administrator',
        organizationId: 'pernod-ricard-poland',
        warehouseIds: [
          'nowy-kisielin-distribution-center',
          'zielona-gora-plant',
        ],
      },
      {
        id: 'warehouse-administrator',
        userId: 'u-2',
        displayName: 'Alice Smith',
        role: 'Warehouse Administrator',
        organizationId: 'pernod-ricard-poland',
        warehouseIds: ['nowy-kisielin-distribution-center'],
      },
      {
        id: 'warehouse-operator',
        userId: 'u-3',
        displayName: 'Bob Jones',
        role: 'Warehouse Operator',
        organizationId: 'pernod-ricard-poland',
        warehouseIds: ['zielona-gora-plant'],
      },
      {
        id: 'security-officer',
        userId: 'u-4',
        displayName: 'Charlie Davis',
        role: 'Security Officer',
        organizationId: 'pernod-ricard-poland',
        warehouseIds: ['nowy-kisielin-distribution-center'],
      },
      {
        id: 'supplier-administrator',
        userId: 'u-5',
        displayName: 'Eve Northstar',
        role: 'Supplier Administrator',
        organizationId: 'northstar-packaging',
        warehouseIds: ['nowy-kisielin-distribution-center'],
        supplierOrganizationId: 'northstar-packaging',
      },
      {
        id: 'supplier-user',
        userId: 'u-7',
        displayName: 'Grace Vistula',
        role: 'Supplier User',
        organizationId: 'vistula-materials',
        warehouseIds: [
          'nowy-kisielin-distribution-center',
          'zielona-gora-plant',
        ],
        supplierOrganizationId: 'vistula-materials',
      },
    ]);
  });

  it('enforces the exact route visibility matrix', () => {
    const expected: Record<(typeof demoActors)[number]['id'], readonly DemoRoute[]> = {
      'system-administrator': routes,
      'warehouse-administrator': routes,
      'warehouse-operator': ['/appointments'],
      'security-officer': ['/appointments'],
      'supplier-administrator': ['/appointments', '/users'],
      'supplier-user': ['/appointments'],
    };

    demoActors.forEach((actor) => {
      expect(routes.filter((route) => canAccessRoute(actor, route))).toEqual(expected[actor.id]);
    });
  });

  it('enforces the exact action visibility matrix', () => {
    const expected: Record<(typeof demoActors)[number]['id'], readonly DemoAction[]> = {
      'system-administrator': actions,
      'warehouse-administrator': ['configure-warehouse'],
      'warehouse-operator': [],
      'security-officer': [],
      'supplier-administrator': ['invite-user'],
      'supplier-user': [],
    };

    demoActors.forEach((actor) => {
      expect(actions.filter((action) => canPerformAction(actor, action))).toEqual(expected[actor.id]);
    });
  });

  it('enforces the exact data-scope matrix for every actor', () => {
    const expected = {
      'system-administrator': {
        warehouses: ['nowy-kisielin-distribution-center', 'zielona-gora-plant'],
        suppliers: ['northstar-packaging', 'baltic-freight', 'vistula-materials'],
        users: ['u-1', 'u-2', 'u-3', 'u-4', 'u-5', 'u-6', 'u-7', 'u-8'],
        appointments: [
          'appointment-001',
          'appointment-002',
          'appointment-003',
          'appointment-004',
          'appointment-005',
          'appointment-006',
          'appointment-007',
          'appointment-008',
        ],
      },
      'warehouse-administrator': {
        warehouses: ['nowy-kisielin-distribution-center'],
        suppliers: ['northstar-packaging', 'vistula-materials'],
        users: ['u-1', 'u-2', 'u-4', 'u-5', 'u-7'],
        appointments: ['appointment-001', 'appointment-003', 'appointment-004', 'appointment-007'],
      },
      'warehouse-operator': {
        warehouses: ['zielona-gora-plant'],
        suppliers: ['baltic-freight', 'vistula-materials'],
        users: ['u-1', 'u-3', 'u-6', 'u-7'],
        appointments: ['appointment-002', 'appointment-005', 'appointment-006', 'appointment-008'],
      },
      'security-officer': {
        warehouses: ['nowy-kisielin-distribution-center'],
        suppliers: ['northstar-packaging', 'vistula-materials'],
        users: ['u-1', 'u-2', 'u-4', 'u-5', 'u-7'],
        appointments: ['appointment-001', 'appointment-003', 'appointment-004', 'appointment-007'],
      },
      'supplier-administrator': {
        warehouses: ['nowy-kisielin-distribution-center'],
        suppliers: ['northstar-packaging'],
        users: ['u-5'],
        appointments: ['appointment-001', 'appointment-004', 'appointment-007'],
      },
      'supplier-user': {
        warehouses: ['nowy-kisielin-distribution-center', 'zielona-gora-plant'],
        suppliers: ['vistula-materials'],
        users: ['u-7'],
        appointments: ['appointment-003', 'appointment-005', 'appointment-008'],
      },
    } as const;

    demoActors.forEach((actor) => {
      expect(demoWarehouses.filter((item) => canViewWarehouse(actor, item.id)).map((item) => item.id))
        .toEqual(expected[actor.id].warehouses);
      expect(demoSupplierOrganizations
        .filter((item) => canViewSupplierOrganization(actor, item.id))
        .map((item) => item.id))
        .toEqual(expected[actor.id].suppliers);
      expect(demoUsers.filter((item) => canViewUser(actor, item)).map((item) => item.id))
        .toEqual(expected[actor.id].users);
      expect(demoAppointments.filter((item) => canViewAppointment(actor, item)).map((item) => item.id))
        .toEqual(expected[actor.id].appointments);
    });
  });
});
