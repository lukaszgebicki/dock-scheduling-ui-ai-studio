import type {
  DemoUser,
  OrganizationId,
  SupplierOrganizationId,
  UiMvpRole,
  WarehouseId,
} from './demoDomain';

export const workflowCapabilities = [
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
] as const;

export type WorkflowCapability = (typeof workflowCapabilities)[number];

export const workflowOutcomes = ['RUN', 'SKIP', 'DELEGATE', 'BLOCK'] as const;
export type WorkflowOutcome = (typeof workflowOutcomes)[number];

export const workflowReasonCodes = [
  'PRIMARY_ACTOR_AVAILABLE',
  'OPTIONAL_ROLE_NOT_CONFIGURED',
  'NO_ACTIVE_PRIMARY_ASSIGNMENT',
  'FALLBACK_ACTOR_AVAILABLE',
  'NO_AUTHORIZED_ACTOR',
  'CAPABILITY_REMOVED_IN_SCOPE',
  'STEP_NOT_APPLICABLE',
] as const;

export type WorkflowReasonCode = (typeof workflowReasonCodes)[number];

export const workflowSteps = [
  'SUPPLIER_RESERVE_NEXT_WEEK',
  'ADMIN_IMPORT_FRIDAY_DETAILS',
  'ADMIN_SCHEDULE_UNRESERVED',
  'ADMIN_RESOLVE_PLANNING_CONFLICT',
  'MANUAL_APPROVAL',
  'MANUAL_REJECTION',
  'REQUEST_APPOINTMENT_DATA',
  'GATE_CHECK_IN',
  'GATE_CHECK_OUT',
  'ASSIGN_DOCK',
  'CHANGE_DOCK',
  'PROGRESS_OPERATION',
  'CONFIRM_NO_SHOW',
  'MANAGE_SUPPLIER_USERS',
] as const;

export type WorkflowStep = (typeof workflowSteps)[number];

export interface WorkflowScope {
  organizationId?: OrganizationId;
  supplierOrganizationId?: SupplierOrganizationId;
  warehouseId?: WarehouseId;
}

export interface ScopedCapabilityRule {
  id: string;
  active: boolean;
  step: WorkflowStep;
  capability: WorkflowCapability;
  actorId: string;
  scope: WorkflowScope;
  effect: 'GRANT' | 'REMOVE';
  isDefault?: boolean;
}

export interface WorkflowRoutingRequest {
  step: WorkflowStep;
  capability: WorkflowCapability;
  scope: WorkflowScope;
  actors: readonly DemoUser[];
  rules?: readonly ScopedCapabilityRule[];
  explicitOwnerId?: string;
  applicable?: boolean;
}

export interface WorkflowRoleEvaluation {
  order: number;
  role: UiMvpRole;
  kind: 'PRIMARY' | 'FALLBACK';
  scopedActorIds: readonly string[];
  eligibleActorIds: readonly string[];
  reasonCode: WorkflowReasonCode;
}

export interface WorkflowRoutingEvidence {
  scope: WorkflowScope;
  evaluatedRoles: readonly UiMvpRole[];
  sequence: readonly WorkflowRoleEvaluation[];
  appliedRuleIds: readonly string[];
  selectedActorId: string | null;
  selectedRole: UiMvpRole | null;
  reasonCode: WorkflowReasonCode;
}

export interface WorkflowRoutingDecision {
  step: WorkflowStep;
  capability: WorkflowCapability;
  outcome: WorkflowOutcome;
  selectedActor: Pick<DemoUser, 'id' | 'fullName' | 'role'> | null;
  evaluatedRoles: readonly UiMvpRole[];
  reasonCode: WorkflowReasonCode;
  diagnostic: string;
  evidence: WorkflowRoutingEvidence;
}

interface WorkflowStepDefinition {
  capability: WorkflowCapability;
  primaryRoles: readonly UiMvpRole[];
  fallbackRoles: readonly UiMvpRole[];
  explicitGrantRoles?: readonly UiMvpRole[];
  optional: boolean;
}

const workflowStepDefinitions: Readonly<Record<WorkflowStep, WorkflowStepDefinition>> = {
  SUPPLIER_RESERVE_NEXT_WEEK: {
    capability: 'BOOK_APPOINTMENT',
    primaryRoles: ['Supplier User', 'Supplier Administrator'],
    fallbackRoles: [],
    optional: true,
  },
  ADMIN_IMPORT_FRIDAY_DETAILS: {
    capability: 'IMPORT_DELIVERY_DETAILS',
    primaryRoles: ['Warehouse Administrator'],
    fallbackRoles: ['System Administrator'],
    optional: false,
  },
  ADMIN_SCHEDULE_UNRESERVED: {
    capability: 'SCHEDULE_UNRESERVED_DELIVERY',
    primaryRoles: ['Warehouse Administrator'],
    fallbackRoles: ['System Administrator'],
    optional: false,
  },
  ADMIN_RESOLVE_PLANNING_CONFLICT: {
    capability: 'RESOLVE_PLANNING_CONFLICT',
    primaryRoles: ['Warehouse Administrator'],
    fallbackRoles: ['System Administrator'],
    optional: false,
  },
  MANUAL_APPROVAL: {
    capability: 'APPROVE_APPOINTMENT',
    primaryRoles: ['Warehouse Administrator'],
    fallbackRoles: ['Warehouse Operator', 'System Administrator'],
    explicitGrantRoles: ['Warehouse Operator'],
    optional: false,
  },
  MANUAL_REJECTION: {
    capability: 'REJECT_APPOINTMENT',
    primaryRoles: ['Warehouse Administrator'],
    fallbackRoles: ['Warehouse Operator', 'System Administrator'],
    explicitGrantRoles: ['Warehouse Operator'],
    optional: false,
  },
  REQUEST_APPOINTMENT_DATA: {
    capability: 'REQUEST_APPOINTMENT_DATA',
    primaryRoles: ['Warehouse Administrator'],
    fallbackRoles: ['Warehouse Operator', 'System Administrator'],
    explicitGrantRoles: ['Warehouse Operator'],
    optional: false,
  },
  GATE_CHECK_IN: {
    capability: 'CHECK_IN',
    primaryRoles: ['Security Officer'],
    fallbackRoles: ['Warehouse Operator', 'Warehouse Administrator'],
    optional: false,
  },
  GATE_CHECK_OUT: {
    capability: 'CHECK_OUT',
    primaryRoles: ['Security Officer'],
    fallbackRoles: ['Warehouse Operator', 'Warehouse Administrator'],
    optional: false,
  },
  ASSIGN_DOCK: {
    capability: 'ASSIGN_DOCK',
    primaryRoles: ['Warehouse Operator'],
    fallbackRoles: ['Warehouse Administrator'],
    optional: false,
  },
  CHANGE_DOCK: {
    capability: 'CHANGE_DOCK',
    primaryRoles: ['Warehouse Operator'],
    fallbackRoles: ['Warehouse Administrator'],
    optional: false,
  },
  PROGRESS_OPERATION: {
    capability: 'PROGRESS_OPERATION',
    primaryRoles: ['Warehouse Operator'],
    fallbackRoles: ['Warehouse Administrator'],
    optional: false,
  },
  CONFIRM_NO_SHOW: {
    capability: 'CONFIRM_NO_SHOW',
    primaryRoles: ['Warehouse Operator'],
    fallbackRoles: ['Warehouse Administrator'],
    optional: false,
  },
  MANAGE_SUPPLIER_USERS: {
    capability: 'MANAGE_SUPPLIER_USERS',
    primaryRoles: ['Supplier Administrator'],
    fallbackRoles: ['System Administrator'],
    optional: false,
  },
};

const diagnostics: Readonly<Record<WorkflowReasonCode, string>> = {
  PRIMARY_ACTOR_AVAILABLE: 'An active primary actor is available in the requested scope.',
  OPTIONAL_ROLE_NOT_CONFIGURED: 'The optional role is not configured in this scope; use the approved Administrator path.',
  NO_ACTIVE_PRIMARY_ASSIGNMENT: 'No active primary actor is assigned in the requested scope.',
  FALLBACK_ACTOR_AVAILABLE: 'No primary actor is available; an authorized fallback actor is selected.',
  NO_AUTHORIZED_ACTOR: 'No authorized actor is available in the requested scope. Configure an eligible assignment.',
  CAPABILITY_REMOVED_IN_SCOPE: 'The required capability is explicitly removed in the requested scope.',
  STEP_NOT_APPLICABLE: 'The workflow step is not applicable in the requested scope.',
};

function scopesMatch(ruleScope: WorkflowScope, requestScope: WorkflowScope): boolean {
  return (ruleScope.organizationId === undefined
      || ruleScope.organizationId === requestScope.organizationId)
    && (ruleScope.supplierOrganizationId === undefined
      || ruleScope.supplierOrganizationId === requestScope.supplierOrganizationId)
    && (ruleScope.warehouseId === undefined
      || ruleScope.warehouseId === requestScope.warehouseId);
}

function scopeSpecificity(scope: WorkflowScope): number {
  return Number(scope.organizationId !== undefined)
    + Number(scope.supplierOrganizationId !== undefined)
    + Number(scope.warehouseId !== undefined);
}

function actorIsInScope(actor: DemoUser, scope: WorkflowScope): boolean {
  if (scope.organizationId !== undefined && actor.organizationId !== scope.organizationId) {
    return false;
  }
  if (scope.warehouseId !== undefined
    && actor.role !== 'System Administrator'
    && !actor.warehouseIds.includes(scope.warehouseId)) {
    return false;
  }
  if (scope.supplierOrganizationId !== undefined
    && (actor.role === 'Supplier User' || actor.role === 'Supplier Administrator')
    && actor.organizationId !== scope.supplierOrganizationId) {
    return false;
  }
  return true;
}

function matchingRulesForActor(
  request: WorkflowRoutingRequest,
  actor: DemoUser,
): readonly ScopedCapabilityRule[] {
  return (request.rules ?? [])
    .filter((rule) => rule.active
      && rule.step === request.step
      && rule.capability === request.capability
      && rule.actorId === actor.id
      && scopesMatch(rule.scope, request.scope))
    .sort((left, right) =>
      scopeSpecificity(right.scope) - scopeSpecificity(left.scope)
      || left.id.localeCompare(right.id));
}

function actorHasCapability(
  actor: DemoUser,
  definition: WorkflowStepDefinition,
  rules: readonly ScopedCapabilityRule[],
): boolean {
  const allowedRoles = [...definition.primaryRoles, ...definition.fallbackRoles];
  if (!allowedRoles.includes(actor.role)) return false;
  const winningRule = rules[0];
  if (winningRule) return winningRule.effect === 'GRANT';
  return !(definition.explicitGrantRoles ?? []).includes(actor.role);
}

function selectActor(
  eligibleActors: readonly DemoUser[],
  request: WorkflowRoutingRequest,
): DemoUser | null {
  const explicitOwner = eligibleActors.find((actor) => actor.id === request.explicitOwnerId);
  if (explicitOwner) return explicitOwner;

  const configuredDefaults = eligibleActors
    .map((actor) => ({ actor, rule: matchingRulesForActor(request, actor)
      .find((candidate) => candidate.isDefault && candidate.effect === 'GRANT') }))
    .filter((candidate): candidate is { actor: DemoUser; rule: ScopedCapabilityRule } =>
      candidate.rule !== undefined)
    .sort((left, right) =>
      scopeSpecificity(right.rule.scope) - scopeSpecificity(left.rule.scope)
      || left.actor.id.localeCompare(right.actor.id));
  if (configuredDefaults[0]) return configuredDefaults[0].actor;

  return [...eligibleActors].sort((left, right) => left.id.localeCompare(right.id))[0] ?? null;
}

function createDecision(
  request: WorkflowRoutingRequest,
  outcome: WorkflowOutcome,
  selectedActor: DemoUser | null,
  reasonCode: WorkflowReasonCode,
  sequence: readonly WorkflowRoleEvaluation[],
  appliedRuleIds: readonly string[],
): WorkflowRoutingDecision {
  const evaluatedRoles = sequence.map((entry) => entry.role);
  return {
    step: request.step,
    capability: request.capability,
    outcome,
    selectedActor: selectedActor
      ? { id: selectedActor.id, fullName: selectedActor.fullName, role: selectedActor.role }
      : null,
    evaluatedRoles,
    reasonCode,
    diagnostic: diagnostics[reasonCode],
    evidence: {
      scope: { ...request.scope },
      evaluatedRoles,
      sequence,
      appliedRuleIds,
      selectedActorId: selectedActor?.id ?? null,
      selectedRole: selectedActor?.role ?? null,
      reasonCode,
    },
  };
}

export function resolveWorkflowRouting(
  request: WorkflowRoutingRequest,
): WorkflowRoutingDecision {
  const definition = workflowStepDefinitions[request.step];
  if (definition.capability !== request.capability) {
    throw new Error(`${request.step} requires ${definition.capability}.`);
  }

  if (request.applicable === false) {
    const outcome = definition.optional ? 'SKIP' : 'BLOCK';
    return createDecision(request, outcome, null, 'STEP_NOT_APPLICABLE', [], []);
  }

  const roleSequence = [
    ...definition.primaryRoles.map((role) => ({ role, kind: 'PRIMARY' as const })),
    ...definition.fallbackRoles.map((role) => ({ role, kind: 'FALLBACK' as const })),
  ];
  const sequence: WorkflowRoleEvaluation[] = [];
  const appliedRuleIds = new Set<string>();

  for (const [index, entry] of roleSequence.entries()) {
    const scopedActors = request.actors.filter((actor) =>
      actor.role === entry.role && actorIsInScope(actor, request.scope));
    const activeActors = scopedActors.filter((actor) => actor.status === 'Active');
    const eligibleActors = activeActors.filter((actor) => {
      const rules = matchingRulesForActor(request, actor);
      if (rules[0]) appliedRuleIds.add(rules[0].id);
      return actorHasCapability(actor, definition, rules);
    });
    const removedInScope = activeActors.length > 0 && eligibleActors.length === 0
      && activeActors.some((actor) => matchingRulesForActor(request, actor)[0]?.effect === 'REMOVE');
    const evaluationReason: WorkflowReasonCode = eligibleActors.length > 0
      ? entry.kind === 'PRIMARY' ? 'PRIMARY_ACTOR_AVAILABLE' : 'FALLBACK_ACTOR_AVAILABLE'
      : removedInScope
        ? 'CAPABILITY_REMOVED_IN_SCOPE'
        : entry.kind === 'PRIMARY' ? 'NO_ACTIVE_PRIMARY_ASSIGNMENT' : 'NO_AUTHORIZED_ACTOR';
    sequence.push({
      order: index + 1,
      role: entry.role,
      kind: entry.kind,
      scopedActorIds: scopedActors.map((actor) => actor.id).sort(),
      eligibleActorIds: eligibleActors.map((actor) => actor.id).sort(),
      reasonCode: evaluationReason,
    });

    const selectedActor = selectActor(eligibleActors, request);
    if (selectedActor) {
      return createDecision(
        request,
        entry.kind === 'PRIMARY' ? 'RUN' : 'DELEGATE',
        selectedActor,
        entry.kind === 'PRIMARY' ? 'PRIMARY_ACTOR_AVAILABLE' : 'FALLBACK_ACTOR_AVAILABLE',
        sequence,
        [...appliedRuleIds].sort(),
      );
    }
  }

  const removedInScope = sequence.some((entry) =>
    entry.reasonCode === 'CAPABILITY_REMOVED_IN_SCOPE');
  if (definition.optional) {
    return createDecision(
      request,
      'SKIP',
      null,
      removedInScope ? 'CAPABILITY_REMOVED_IN_SCOPE' : 'OPTIONAL_ROLE_NOT_CONFIGURED',
      sequence,
      [...appliedRuleIds].sort(),
    );
  }
  return createDecision(
    request,
    'BLOCK',
    null,
    removedInScope ? 'CAPABILITY_REMOVED_IN_SCOPE' : 'NO_AUTHORIZED_ACTOR',
    sequence,
    [...appliedRuleIds].sort(),
  );
}

export function workflowDecisionAllowsActor(
  decision: WorkflowRoutingDecision,
  actorId: string,
): boolean {
  return (decision.outcome === 'RUN' || decision.outcome === 'DELEGATE')
    && decision.selectedActor?.id === actorId;
}
