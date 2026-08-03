import { describe, expect, it } from 'vitest';
import type { DemoUser } from './demoDomain';
import {
  resolveWorkflowRouting,
  workflowCapabilities,
  workflowDecisionAllowsActor,
  workflowOutcomes,
  workflowReasonCodes,
  type ScopedCapabilityRule,
  type WorkflowRoutingRequest,
} from './workflowRouting';

const warehouseA = 'nowy-kisielin-distribution-center' as const;
const warehouseB = 'zielona-gora-plant' as const;

function user(overrides: Partial<DemoUser> & Pick<DemoUser, 'id' | 'role'>): DemoUser {
  return {
    fullName: overrides.id,
    email: `${overrides.id}@example.test`,
    organizationId: 'pernod-ricard-poland',
    warehouseIds: [warehouseA],
    status: 'Active',
    lastActive: 'Deterministic fixture',
    accountType: 'Internal',
    ...overrides,
  };
}

function request(
  overrides: Partial<WorkflowRoutingRequest> = {},
): WorkflowRoutingRequest {
  return {
    step: 'ADMIN_IMPORT_FRIDAY_DETAILS',
    capability: 'IMPORT_DELIVERY_DETAILS',
    scope: { organizationId: 'pernod-ricard-poland', warehouseId: warehouseA },
    actors: [],
    ...overrides,
  };
}

describe('workflow routing contract', () => {
  it('defines exactly the approved capabilities, outcomes and stable reason codes', () => {
    expect(workflowCapabilities).toEqual([
      'BOOK_APPOINTMENT',
      'IMPORT_DELIVERY_DETAILS',
      'SCHEDULE_UNRESERVED_DELIVERY',
      'RESOLVE_PLANNING_CONFLICT',
      'APPROVE_APPOINTMENT',
      'REJECT_APPOINTMENT',
      'REQUEST_APPOINTMENT_DATA',
      'CHECK_IN',
      'CHECK_OUT',
      'ASSIGN_DOCK',
      'CHANGE_DOCK',
      'PROGRESS_OPERATION',
      'CONFIRM_NO_SHOW',
      'MANAGE_SUPPLIER_USERS',
    ]);
    expect(workflowOutcomes).toEqual(['RUN', 'SKIP', 'DELEGATE', 'BLOCK']);
    expect(workflowReasonCodes).toEqual([
      'PRIMARY_ACTOR_AVAILABLE',
      'OPTIONAL_ROLE_NOT_CONFIGURED',
      'NO_ACTIVE_PRIMARY_ASSIGNMENT',
      'FALLBACK_ACTOR_AVAILABLE',
      'NO_AUTHORIZED_ACTOR',
      'CAPABILITY_REMOVED_IN_SCOPE',
      'STEP_NOT_APPLICABLE',
    ]);
  });

  it('AC-FLOW-001 skips missing Supplier participation without a placeholder actor', () => {
    const decision = resolveWorkflowRouting(request({
      step: 'SUPPLIER_RESERVE_NEXT_WEEK',
      capability: 'BOOK_APPOINTMENT',
      scope: { supplierOrganizationId: 'northstar-packaging', warehouseId: warehouseA },
      actors: [user({ id: 'admin', role: 'System Administrator' })],
    }));

    expect(decision).toMatchObject({
      outcome: 'SKIP',
      selectedActor: null,
      reasonCode: 'OPTIONAL_ROLE_NOT_CONFIGURED',
    });
    expect(decision.diagnostic).toContain('Administrator path');
    expect(decision).not.toHaveProperty('appointment');
    expect(decision).not.toHaveProperty('success');
  });

  it('AC-FLOW-002 runs Supplier booking only for an active actor in both Supplier and warehouse scope', () => {
    const eligible = user({
      id: 'supplier-a',
      role: 'Supplier User',
      organizationId: 'northstar-packaging',
      accountType: 'Supplier',
      warehouseIds: [warehouseA],
    });
    const otherSupplier = user({
      id: 'supplier-b',
      role: 'Supplier Administrator',
      organizationId: 'baltic-freight',
      accountType: 'Supplier',
      warehouseIds: [warehouseA],
    });
    const otherWarehouse = user({
      id: 'supplier-c',
      role: 'Supplier User',
      organizationId: 'northstar-packaging',
      accountType: 'Supplier',
      warehouseIds: [warehouseB],
    });

    const decision = resolveWorkflowRouting(request({
      step: 'SUPPLIER_RESERVE_NEXT_WEEK',
      capability: 'BOOK_APPOINTMENT',
      scope: { supplierOrganizationId: 'northstar-packaging', warehouseId: warehouseA },
      actors: [otherSupplier, otherWarehouse, eligible],
    }));

    expect(decision.outcome).toBe('RUN');
    expect(decision.selectedActor?.id).toBe('supplier-a');
    expect(decision.evidence.sequence[0].eligibleActorIds).toEqual(['supplier-a']);
  });

  it('AC-FLOW-003 delegates Friday import to System Administrator without changing capability', () => {
    const decision = resolveWorkflowRouting(request({
      actors: [user({ id: 'system', role: 'System Administrator', warehouseIds: [] })],
    }));

    expect(decision).toMatchObject({
      step: 'ADMIN_IMPORT_FRIDAY_DETAILS',
      capability: 'IMPORT_DELIVERY_DETAILS',
      outcome: 'DELEGATE',
      reasonCode: 'FALLBACK_ACTOR_AVAILABLE',
      selectedActor: { id: 'system', role: 'System Administrator' },
    });
  });

  it('AC-FLOW-004 blocks mandatory import when primary and fallback are unavailable', () => {
    const decision = resolveWorkflowRouting(request({
      actors: [user({ id: 'operator', role: 'Warehouse Operator' })],
    }));

    expect(decision.outcome).toBe('BLOCK');
    expect(decision.selectedActor).toBeNull();
    expect(decision.reasonCode).toBe('NO_AUTHORIZED_ACTOR');
    expect(decision.diagnostic).toContain('Configure an eligible assignment');
  });

  it('AC-FLOW-005 requires an explicit scoped grant for Warehouse Operator approval fallback', () => {
    const operator = user({ id: 'operator', role: 'Warehouse Operator' });
    const approvalRequest = request({
      step: 'MANUAL_APPROVAL',
      capability: 'APPROVE_APPOINTMENT',
      actors: [operator],
    });

    expect(resolveWorkflowRouting(approvalRequest).outcome).toBe('BLOCK');

    const grant: ScopedCapabilityRule = {
      id: 'approval-operator-a',
      active: true,
      step: 'MANUAL_APPROVAL',
      capability: 'APPROVE_APPOINTMENT',
      actorId: 'operator',
      scope: { warehouseId: warehouseA },
      effect: 'GRANT',
    };
    const delegated = resolveWorkflowRouting({ ...approvalRequest, rules: [grant] });
    expect(delegated.outcome).toBe('DELEGATE');
    expect(delegated.selectedActor?.id).toBe('operator');
    expect(delegated).not.toHaveProperty('approved');
    expect(delegated).not.toHaveProperty('historyEvent');
  });

  it('AC-FLOW-006 delegates gate work only to an active actor in the same warehouse', () => {
    const decision = resolveWorkflowRouting(request({
      step: 'GATE_CHECK_IN',
      capability: 'CHECK_IN',
      actors: [
        user({ id: 'security', role: 'Security Officer', status: 'Inactive' }),
        user({ id: 'operator-b', role: 'Warehouse Operator', warehouseIds: [warehouseB] }),
        user({ id: 'operator-a', role: 'Warehouse Operator', warehouseIds: [warehouseA] }),
      ],
    }));

    expect(decision.outcome).toBe('DELEGATE');
    expect(decision.selectedActor?.id).toBe('operator-a');
    expect(decision.evidence.sequence[1].eligibleActorIds).toEqual(['operator-a']);
  });

  it('AC-FLOW-007 exposes one decision to navigation, action and direct-route adapters', () => {
    const decision = resolveWorkflowRouting(request({
      actors: [user({ id: 'warehouse-admin', role: 'Warehouse Administrator' })],
    }));
    const navigationVisible = workflowDecisionAllowsActor(decision, 'warehouse-admin');
    const actionVisible = workflowDecisionAllowsActor(decision, 'warehouse-admin');
    const directRouteAllowed = workflowDecisionAllowsActor(decision, 'warehouse-admin');

    expect([navigationVisible, actionVisible, directRouteAllowed]).toEqual([true, true, true]);
    expect(workflowDecisionAllowsActor(decision, 'other-actor')).toBe(false);
  });

  it('uses explicit owner, then narrow scoped default, then stable actor ID', () => {
    const actorA = user({ id: 'a-actor', role: 'Warehouse Administrator' });
    const actorB = user({ id: 'b-actor', role: 'Warehouse Administrator' });
    const base = request({ actors: [actorB, actorA] });

    expect(resolveWorkflowRouting(base).selectedActor?.id).toBe('a-actor');
    expect(resolveWorkflowRouting({ ...base, explicitOwnerId: 'b-actor' }).selectedActor?.id)
      .toBe('b-actor');

    const broadDefault: ScopedCapabilityRule = {
      id: 'broad-default',
      active: true,
      step: base.step,
      capability: base.capability,
      actorId: 'a-actor',
      scope: { organizationId: 'pernod-ricard-poland' },
      effect: 'GRANT',
      isDefault: true,
    };
    const narrowDefault: ScopedCapabilityRule = {
      ...broadDefault,
      id: 'narrow-default',
      actorId: 'b-actor',
      scope: { organizationId: 'pernod-ricard-poland', warehouseId: warehouseA },
    };
    expect(resolveWorkflowRouting({ ...base, rules: [broadDefault, narrowDefault] })
      .selectedActor?.id).toBe('b-actor');
  });

  it('lets the narrowest active removal win and never grants a disallowed role', () => {
    const admin = user({ id: 'warehouse-admin', role: 'Warehouse Administrator' });
    const operator = user({ id: 'operator', role: 'Warehouse Operator' });
    const broadGrant: ScopedCapabilityRule = {
      id: 'broad-grant',
      active: true,
      step: 'ADMIN_IMPORT_FRIDAY_DETAILS',
      capability: 'IMPORT_DELIVERY_DETAILS',
      actorId: admin.id,
      scope: { organizationId: 'pernod-ricard-poland' },
      effect: 'GRANT',
    };
    const narrowRemoval: ScopedCapabilityRule = {
      ...broadGrant,
      id: 'narrow-removal',
      scope: { organizationId: 'pernod-ricard-poland', warehouseId: warehouseA },
      effect: 'REMOVE',
    };
    const invalidGrant: ScopedCapabilityRule = {
      ...broadGrant,
      id: 'invalid-operator-grant',
      actorId: operator.id,
      effect: 'GRANT',
    };

    const decision = resolveWorkflowRouting(request({
      actors: [admin, operator],
      rules: [broadGrant, narrowRemoval, invalidGrant],
    }));
    expect(decision.outcome).toBe('BLOCK');
    expect(decision.reasonCode).toBe('CAPABILITY_REMOVED_IN_SCOPE');
    expect(decision.evidence.appliedRuleIds).toEqual(['narrow-removal']);
  });

  it('ignores inactive and out-of-scope rules without escalating their scope', () => {
    const admin = user({ id: 'warehouse-admin', role: 'Warehouse Administrator' });
    const inactiveRemoval: ScopedCapabilityRule = {
      id: 'inactive-removal',
      active: false,
      step: 'ADMIN_IMPORT_FRIDAY_DETAILS',
      capability: 'IMPORT_DELIVERY_DETAILS',
      actorId: admin.id,
      scope: { warehouseId: warehouseA },
      effect: 'REMOVE',
    };
    const otherWarehouseRemoval: ScopedCapabilityRule = {
      ...inactiveRemoval,
      id: 'other-warehouse-removal',
      active: true,
      scope: { warehouseId: warehouseB },
    };

    const decision = resolveWorkflowRouting(request({
      actors: [admin],
      rules: [inactiveRemoval, otherWarehouseRemoval],
    }));
    expect(decision.outcome).toBe('RUN');
    expect(decision.evidence.appliedRuleIds).toEqual([]);
  });

  it('never degrades mandatory steps to SKIP, including not-applicable requests', () => {
    expect(resolveWorkflowRouting(request({ applicable: false })).outcome).toBe('BLOCK');
    expect(resolveWorkflowRouting(request({ applicable: false })).reasonCode)
      .toBe('STEP_NOT_APPLICABLE');
    expect(resolveWorkflowRouting(request({
      step: 'SUPPLIER_RESERVE_NEXT_WEEK',
      capability: 'BOOK_APPOINTMENT',
      applicable: false,
    })).outcome).toBe('SKIP');
  });

  it('defines dock and operational decisions without executing business actions', () => {
    for (const [step, capability] of [
      ['ASSIGN_DOCK', 'ASSIGN_DOCK'],
      ['PROGRESS_OPERATION', 'PROGRESS_OPERATION'],
      ['CONFIRM_NO_SHOW', 'CONFIRM_NO_SHOW'],
    ] as const) {
      const decision = resolveWorkflowRouting(request({
        step,
        capability,
        actors: [user({ id: 'warehouse-admin', role: 'Warehouse Administrator' })],
      }));
      expect(decision.outcome).toBe('DELEGATE');
      expect(decision.selectedActor?.role).toBe('Warehouse Administrator');
      expect(decision).not.toHaveProperty('appointmentStatus');
    }
  });

  it('is pure and deterministic and records no clock-dependent evidence', () => {
    const routingRequest = request({
      actors: [user({ id: 'warehouse-admin', role: 'Warehouse Administrator' })],
    });
    const first = resolveWorkflowRouting(routingRequest);
    const second = resolveWorkflowRouting(routingRequest);

    expect(second).toEqual(first);
    expect(JSON.stringify(first)).not.toMatch(/timestamp|createdAt|updatedAt/i);
    expect(first.evidence.sequence.map((entry) => entry.order)).toEqual([1]);
  });

  it('rejects a step/capability mismatch instead of weakening validation', () => {
    expect(() => resolveWorkflowRouting(request({ capability: 'CHECK_IN' })))
      .toThrow('ADMIN_IMPORT_FRIDAY_DETAILS requires IMPORT_DELIVERY_DETAILS');
  });
});
