import type { WarehouseConfiguration } from './configuration';
import type { DemoActor, WarehouseId } from './demoDomain';

export const transportRequirementCombinations = [
  'NONE',
  'TRACTOR_ONLY',
  'TRAILER_OR_CONTAINER_ONLY',
  'BOTH',
] as const;

export type TransportRequirement =
  (typeof transportRequirementCombinations)[number];

export interface TransportDetails {
  tractorRegistration: string;
  trailerOrContainerRegistration: string;
}

export type TransportField = keyof TransportDetails;

export interface TransportRule {
  id: string;
  active: boolean;
  warehouseId: WarehouseId;
  loadCarrierType: string;
  goodsCategory: string;
  requirement: TransportRequirement;
}

export interface TransportDeliveryLine {
  id: string;
  loadCarrierType: string;
  goodsCategory: string;
}

export interface TransportRuleEvidence {
  lineId: string;
  ruleId: string;
  requirement: TransportRequirement;
  requiresTractor: boolean;
  requiresTrailerOrContainer: boolean;
}

export const transportReadinessReasonCodes = [
  'TRANSPORT_READY',
  'MISSING_TRANSPORT_RULE',
  'AMBIGUOUS_TRANSPORT_RULE',
  'MISSING_TRACTOR_REGISTRATION',
  'MISSING_TRAILER_OR_CONTAINER_REGISTRATION',
] as const;

export type TransportReadinessReasonCode =
  (typeof transportReadinessReasonCodes)[number];

export interface TransportReadinessReason {
  code: TransportReadinessReasonCode;
  message: string;
  lineId?: string;
  field?: TransportField;
}

export interface TransportReadinessRequest {
  warehouseId: WarehouseId;
  lines: readonly TransportDeliveryLine[];
  rules: readonly TransportRule[];
  details: Partial<TransportDetails>;
}

export interface TransportReadinessResult {
  ready: boolean;
  planningState: 'READY' | 'VALIDATION_CONFLICT';
  effectiveRequirement: TransportRequirement;
  normalizedDetails: TransportDetails;
  evidence: readonly TransportRuleEvidence[];
  reasons: readonly TransportReadinessReason[];
}

export interface SupplierTransportValidation {
  valid: boolean;
  normalizedDetails: TransportDetails;
  missingFields: readonly TransportField[];
}

export const transportReconciliationStatuses = [
  'NO_IMPORTED_VALUE',
  'MATCH',
  'CONFLICT',
] as const;

export type TransportReconciliationStatus =
  (typeof transportReconciliationStatuses)[number];

export interface TransportReconciliationFieldEvidence {
  field: TransportField;
  supplierValue: string;
  importedValue: string;
  status: TransportReconciliationStatus;
}

export interface TransportReconciliationInspection {
  requiresDecision: boolean;
  preservedSupplierDetails: TransportDetails;
  fields: readonly TransportReconciliationFieldEvidence[];
}

export type TransportRecordOrigin =
  | 'SUPPLIER_RESERVED'
  | 'ADMIN_ADDED'
  | 'IMPORTED';

export type TransportWarehouseScope = Pick<
  WarehouseConfiguration,
  'id' | 'administratorUserIds'
>;

export interface AdministratorTransportChangeRequest {
  actor: DemoActor;
  warehouse: TransportWarehouseScope;
  origin: TransportRecordOrigin;
  current: Partial<TransportDetails>;
  next: Partial<TransportDetails>;
  reason: string;
}

export interface AdministratorTransportChangeEvidence {
  actorId: DemoActor['id'];
  userId: DemoActor['userId'];
  warehouseId: WarehouseId;
  origin: TransportRecordOrigin;
  reason: string;
  before: TransportDetails;
  after: TransportDetails;
  changedFields: readonly TransportField[];
}

export interface AdministratorTransportChangeResult {
  details: TransportDetails;
  evidence: AdministratorTransportChangeEvidence;
}

const transportFields: readonly TransportField[] = [
  'tractorRegistration',
  'trailerOrContainerRegistration',
];

function normalizeText(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function comparisonKey(value: string | null | undefined): string {
  return normalizeText(value).toLocaleUpperCase('en-US');
}

function normalizeDetails(
  details: Partial<TransportDetails>,
): TransportDetails {
  return {
    tractorRegistration: normalizeText(details.tractorRegistration),
    trailerOrContainerRegistration: normalizeText(
      details.trailerOrContainerRegistration,
    ),
  };
}

function dimensionKey(value: string): string {
  return normalizeText(value).toLocaleLowerCase('en-US');
}

function requirementFlags(requirement: TransportRequirement): {
  requiresTractor: boolean;
  requiresTrailerOrContainer: boolean;
} {
  return {
    requiresTractor:
      requirement === 'TRACTOR_ONLY' || requirement === 'BOTH',
    requiresTrailerOrContainer:
      requirement === 'TRAILER_OR_CONTAINER_ONLY' || requirement === 'BOTH',
  };
}

function requirementFromFlags(
  requiresTractor: boolean,
  requiresTrailerOrContainer: boolean,
): TransportRequirement {
  if (requiresTractor && requiresTrailerOrContainer) return 'BOTH';
  if (requiresTractor) return 'TRACTOR_ONLY';
  if (requiresTrailerOrContainer) return 'TRAILER_OR_CONTAINER_ONLY';
  return 'NONE';
}

export function validateSupplierTransportDetails(
  details: Partial<TransportDetails>,
): SupplierTransportValidation {
  const normalizedDetails = normalizeDetails(details);
  const missingFields = transportFields.filter(
    (field) => normalizedDetails[field].length === 0,
  );

  return {
    valid: missingFields.length === 0,
    normalizedDetails,
    missingFields,
  };
}

function matchingRules(
  request: TransportReadinessRequest,
  line: TransportDeliveryLine,
): readonly TransportRule[] {
  const loadCarrierType = dimensionKey(line.loadCarrierType);
  const goodsCategory = dimensionKey(line.goodsCategory);

  return request.rules
    .filter((rule) =>
      rule.active
      && rule.warehouseId === request.warehouseId
      && dimensionKey(rule.loadCarrierType) === loadCarrierType
      && dimensionKey(rule.goodsCategory) === goodsCategory)
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function resolveTransportReadiness(
  request: TransportReadinessRequest,
): TransportReadinessResult {
  const normalizedDetails = normalizeDetails(request.details);
  const evidence: TransportRuleEvidence[] = [];
  const reasons: TransportReadinessReason[] = [];
  let requiresTractor = false;
  let requiresTrailerOrContainer = false;

  const orderedLines = request.lines
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id));

  for (const line of orderedLines) {
    const matches = matchingRules(request, line);

    if (matches.length === 0) {
      reasons.push({
        code: 'MISSING_TRANSPORT_RULE',
        lineId: line.id,
        message: `No active transport rule matches delivery line ${line.id}.`,
      });
      continue;
    }

    if (matches.length > 1) {
      reasons.push({
        code: 'AMBIGUOUS_TRANSPORT_RULE',
        lineId: line.id,
        message: `More than one active transport rule matches delivery line ${line.id}.`,
      });
      continue;
    }

    const rule = matches[0];
    const flags = requirementFlags(rule.requirement);
    requiresTractor ||= flags.requiresTractor;
    requiresTrailerOrContainer ||= flags.requiresTrailerOrContainer;
    evidence.push({
      lineId: line.id,
      ruleId: rule.id,
      requirement: rule.requirement,
      ...flags,
    });
  }

  if (requiresTractor && normalizedDetails.tractorRegistration.length === 0) {
    reasons.push({
      code: 'MISSING_TRACTOR_REGISTRATION',
      field: 'tractorRegistration',
      message: 'The effective downstream requirement needs a tractor registration.',
    });
  }

  if (
    requiresTrailerOrContainer
    && normalizedDetails.trailerOrContainerRegistration.length === 0
  ) {
    reasons.push({
      code: 'MISSING_TRAILER_OR_CONTAINER_REGISTRATION',
      field: 'trailerOrContainerRegistration',
      message:
        'The effective downstream requirement needs a trailer or container registration.',
    });
  }

  const effectiveRequirement = requirementFromFlags(
    requiresTractor,
    requiresTrailerOrContainer,
  );
  const ready = reasons.length === 0;

  return {
    ready,
    planningState: ready ? 'READY' : 'VALIDATION_CONFLICT',
    effectiveRequirement,
    normalizedDetails,
    evidence,
    reasons: ready
      ? [{
          code: 'TRANSPORT_READY',
          message: 'Transport readiness requirements are satisfied.',
        }]
      : reasons,
  };
}

function reconciliationField(
  field: TransportField,
  supplierValue: string | null | undefined,
  importedValue: string | null | undefined,
): TransportReconciliationFieldEvidence {
  const normalizedSupplierValue = normalizeText(supplierValue);
  const normalizedImportedValue = normalizeText(importedValue);

  if (normalizedImportedValue.length === 0) {
    return {
      field,
      supplierValue: normalizedSupplierValue,
      importedValue: '',
      status: 'NO_IMPORTED_VALUE',
    };
  }

  return {
    field,
    supplierValue: normalizedSupplierValue,
    importedValue: normalizedImportedValue,
    status:
      comparisonKey(normalizedSupplierValue)
        === comparisonKey(normalizedImportedValue)
        ? 'MATCH'
        : 'CONFLICT',
  };
}

export function inspectTransportReconciliation(
  supplierDetails: Partial<TransportDetails>,
  importedDetails: Partial<TransportDetails>,
): TransportReconciliationInspection {
  const preservedSupplierDetails = normalizeDetails(supplierDetails);
  const fields = transportFields.map((field) =>
    reconciliationField(
      field,
      preservedSupplierDetails[field],
      importedDetails[field],
    ));

  return {
    requiresDecision: fields.some((field) => field.status === 'CONFLICT'),
    preservedSupplierDetails,
    fields,
  };
}

export function canAdministerTransport(
  actor: DemoActor,
  warehouse: TransportWarehouseScope,
): boolean {
  if (actor.role === 'System Administrator') return true;

  return actor.role === 'Warehouse Administrator'
    && actor.warehouseIds.includes(warehouse.id)
    && warehouse.administratorUserIds.includes(actor.userId);
}

export function applyAdministratorTransportChange(
  request: AdministratorTransportChangeRequest,
): AdministratorTransportChangeResult {
  if (!canAdministerTransport(request.actor, request.warehouse)) {
    throw new Error(
      'The active demo actor cannot change transport data for this warehouse.',
    );
  }

  const reason = normalizeText(request.reason);
  if (reason.length === 0) {
    throw new Error('A transport change requires a reason.');
  }

  const before = normalizeDetails(request.current);
  const after = normalizeDetails(request.next);

  if (
    request.origin === 'SUPPLIER_RESERVED'
    && !validateSupplierTransportDetails(after).valid
  ) {
    throw new Error(
      'Supplier-reserved transport data must retain both required identifiers.',
    );
  }

  const changedFields = transportFields.filter(
    (field) => before[field] !== after[field],
  );
  if (changedFields.length === 0) {
    throw new Error('Transport values are unchanged.');
  }

  return {
    details: after,
    evidence: {
      actorId: request.actor.id,
      userId: request.actor.userId,
      warehouseId: request.warehouse.id,
      origin: request.origin,
      reason,
      before,
      after,
      changedFields,
    },
  };
}
