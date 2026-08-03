import { describe, expect, it } from 'vitest';
import { asWarehouseId, demoActors } from './demoDomain';
import {
  applyAdministratorTransportChange,
  inspectTransportReconciliation,
  resolveTransportReadiness,
  transportRequirementCombinations,
  validateSupplierTransportDetails,
  type TransportDeliveryLine,
  type TransportRequirement,
  type TransportRule,
  type TransportWarehouseScope,
} from './transportRules';

const warehouseA = asWarehouseId('nowy-kisielin-distribution-center');
const warehouseB = asWarehouseId('zielona-gora-plant');

const systemAdministrator = demoActors.find(
  (actor) => actor.id === 'system-administrator',
)!;
const warehouseAdministrator = demoActors.find(
  (actor) => actor.id === 'warehouse-administrator',
)!;
const warehouseOperator = demoActors.find(
  (actor) => actor.id === 'warehouse-operator',
)!;

const warehouseScopeA: TransportWarehouseScope = {
  id: warehouseA,
  administratorUserIds: ['u-2'],
};
const warehouseScopeB: TransportWarehouseScope = {
  id: warehouseB,
  administratorUserIds: ['u-2'],
};

function line(
  id: string,
  loadCarrierType = 'EURO_PALLET',
  goodsCategory = 'DRY_GOODS',
): TransportDeliveryLine {
  return { id, loadCarrierType, goodsCategory };
}

function rule(
  id: string,
  requirement: TransportRequirement,
  overrides: Partial<TransportRule> = {},
): TransportRule {
  return {
    id,
    active: true,
    warehouseId: warehouseA,
    loadCarrierType: 'EURO_PALLET',
    goodsCategory: 'DRY_GOODS',
    requirement,
    ...overrides,
  };
}

describe('transport readiness contract', () => {
  it('defines exactly the four approved downstream combinations', () => {
    expect(transportRequirementCombinations).toEqual([
      'NONE',
      'TRACTOR_ONLY',
      'TRAILER_OR_CONTAINER_ONLY',
      'BOTH',
    ]);
  });

  it('AC-TRN-001 keeps both Supplier identifiers required for every matrix combination', () => {
    for (const requirement of transportRequirementCombinations) {
      const details = requirement === 'BOTH'
        ? {
            tractorRegistration: 'TR-100',
            trailerOrContainerRegistration: 'TRL-200',
          }
        : requirement === 'TRACTOR_ONLY'
          ? { tractorRegistration: 'TR-100' }
          : requirement === 'TRAILER_OR_CONTAINER_ONLY'
            ? { trailerOrContainerRegistration: 'TRL-200' }
            : {};

      expect(validateSupplierTransportDetails(details).valid).toBe(
        requirement === 'BOTH',
      );
    }
  });

  it.each([
    ['NONE', {}, 'NONE'],
    ['TRACTOR_ONLY', { tractorRegistration: 'TR-100' }, 'TRACTOR_ONLY'],
    [
      'TRAILER_OR_CONTAINER_ONLY',
      { trailerOrContainerRegistration: 'TRL-200' },
      'TRAILER_OR_CONTAINER_ONLY',
    ],
    [
      'BOTH',
      {
        tractorRegistration: 'TR-100',
        trailerOrContainerRegistration: 'TRL-200',
      },
      'BOTH',
    ],
  ] as const)(
    'AC-TRN-001 validates %s using exactly its downstream field set',
    (requirement, details, expectedRequirement) => {
      const result = resolveTransportReadiness({
        warehouseId: warehouseA,
        lines: [line('line-1')],
        rules: [rule('rule-1', requirement)],
        details,
      });

      expect(result.ready).toBe(true);
      expect(result.planningState).toBe('READY');
      expect(result.effectiveRequirement).toBe(expectedRequirement);
      expect(result.reasons.map((reason) => reason.code)).toEqual([
        'TRANSPORT_READY',
      ]);
    },
  );

  it('returns VALIDATION_CONFLICT when a configured downstream field is missing', () => {
    const result = resolveTransportReadiness({
      warehouseId: warehouseA,
      lines: [line('line-1')],
      rules: [rule('rule-1', 'BOTH')],
      details: { tractorRegistration: 'TR-100' },
    });

    expect(result.ready).toBe(false);
    expect(result.planningState).toBe('VALIDATION_CONFLICT');
    expect(result.reasons.map((reason) => reason.code)).toEqual([
      'MISSING_TRAILER_OR_CONTAINER_REGISTRATION',
    ]);
    expect(result).not.toHaveProperty('appointment');
    expect(result).not.toHaveProperty('success');
    expect(result).not.toHaveProperty('bookingOrigin');
  });

  it('matches only an active exact warehouse, load-carrier and goods-category rule', () => {
    const result = resolveTransportReadiness({
      warehouseId: warehouseA,
      lines: [line('line-1')],
      rules: [
        rule('inactive-exact', 'NONE', { active: false }),
        rule('other-warehouse', 'NONE', { warehouseId: warehouseB }),
        rule('partial-carrier', 'NONE', { loadCarrierType: 'EURO' }),
      ],
      details: {},
    });

    expect(result.ready).toBe(false);
    expect(result.reasons).toMatchObject([
      { code: 'MISSING_TRANSPORT_RULE', lineId: 'line-1' },
    ]);
  });

  it('normalizes surrounding whitespace and case for exact dimensions and identifiers', () => {
    const result = resolveTransportReadiness({
      warehouseId: warehouseA,
      lines: [line('line-1', ' euro_pallet ', 'dry_goods')],
      rules: [rule('rule-1', 'BOTH')],
      details: {
        tractorRegistration: ' TR-100 ',
        trailerOrContainerRegistration: ' trl-200 ',
      },
    });

    expect(result.ready).toBe(true);
    expect(result.normalizedDetails).toEqual({
      tractorRegistration: 'TR-100',
      trailerOrContainerRegistration: 'trl-200',
    });
  });

  it('AC-TRN-002 computes logical OR and deterministic source evidence for multi-line PO data', () => {
    const result = resolveTransportReadiness({
      warehouseId: warehouseA,
      lines: [
        line('line-b', 'BOX', 'FINISHED_GOODS'),
        line('line-a'),
      ],
      rules: [
        rule('rule-trailer', 'TRAILER_OR_CONTAINER_ONLY', {
          loadCarrierType: 'BOX',
          goodsCategory: 'FINISHED_GOODS',
        }),
        rule('rule-tractor', 'TRACTOR_ONLY'),
      ],
      details: {
        tractorRegistration: 'TR-100',
        trailerOrContainerRegistration: 'TRL-200',
      },
    });

    expect(result.ready).toBe(true);
    expect(result.effectiveRequirement).toBe('BOTH');
    expect(result.evidence).toEqual([
      {
        lineId: 'line-a',
        ruleId: 'rule-tractor',
        requirement: 'TRACTOR_ONLY',
        requiresTractor: true,
        requiresTrailerOrContainer: false,
      },
      {
        lineId: 'line-b',
        ruleId: 'rule-trailer',
        requirement: 'TRAILER_OR_CONTAINER_ONLY',
        requiresTractor: false,
        requiresTrailerOrContainer: true,
      },
    ]);
  });

  it('AC-TRN-003 blocks a line without an active matching rule', () => {
    const result = resolveTransportReadiness({
      warehouseId: warehouseA,
      lines: [line('unconfigured-line', 'SLIPSHEET', 'SPIRITS')],
      rules: [],
      details: {
        tractorRegistration: 'TR-100',
        trailerOrContainerRegistration: 'TRL-200',
      },
    });

    expect(result).toMatchObject({
      ready: false,
      planningState: 'VALIDATION_CONFLICT',
      effectiveRequirement: 'NONE',
    });
    expect(result.reasons).toMatchObject([
      {
        code: 'MISSING_TRANSPORT_RULE',
        lineId: 'unconfigured-line',
      },
    ]);
  });

  it('fails closed when more than one active exact rule matches a line', () => {
    const result = resolveTransportReadiness({
      warehouseId: warehouseA,
      lines: [line('line-1')],
      rules: [rule('rule-a', 'NONE'), rule('rule-b', 'BOTH')],
      details: {
        tractorRegistration: 'TR-100',
        trailerOrContainerRegistration: 'TRL-200',
      },
    });

    expect(result.ready).toBe(false);
    expect(result.reasons).toMatchObject([
      { code: 'AMBIGUOUS_TRANSPORT_RULE', lineId: 'line-1' },
    ]);
    expect(result.evidence).toEqual([]);
  });

  it('inspects imported values without silently overwriting Supplier data', () => {
    const inspection = inspectTransportReconciliation(
      {
        tractorRegistration: ' TR-100 ',
        trailerOrContainerRegistration: 'TRL-200',
      },
      {
        tractorRegistration: 'tr-100',
        trailerOrContainerRegistration: 'TRL-999',
      },
    );

    expect(inspection.requiresDecision).toBe(true);
    expect(inspection.preservedSupplierDetails).toEqual({
      tractorRegistration: 'TR-100',
      trailerOrContainerRegistration: 'TRL-200',
    });
    expect(inspection.fields).toEqual([
      {
        field: 'tractorRegistration',
        supplierValue: 'TR-100',
        importedValue: 'tr-100',
        status: 'MATCH',
      },
      {
        field: 'trailerOrContainerRegistration',
        supplierValue: 'TRL-200',
        importedValue: 'TRL-999',
        status: 'CONFLICT',
      },
    ]);
  });

  it('treats empty imported values as no proposed overwrite', () => {
    const inspection = inspectTransportReconciliation(
      {
        tractorRegistration: 'TR-100',
        trailerOrContainerRegistration: 'TRL-200',
      },
      { tractorRegistration: '   ' },
    );

    expect(inspection.requiresDecision).toBe(false);
    expect(inspection.fields.map((field) => field.status)).toEqual([
      'NO_IMPORTED_VALUE',
      'NO_IMPORTED_VALUE',
    ]);
  });

  it('records an explicit assigned Administrator change with before and after evidence', () => {
    const result = applyAdministratorTransportChange({
      actor: warehouseAdministrator,
      warehouse: warehouseScopeA,
      origin: 'SUPPLIER_RESERVED',
      current: {
        tractorRegistration: 'TR-100',
        trailerOrContainerRegistration: 'TRL-200',
      },
      next: {
        tractorRegistration: 'TR-101',
        trailerOrContainerRegistration: 'TRL-200',
      },
      reason: 'Corrected registration after carrier confirmation',
    });

    expect(result.details.tractorRegistration).toBe('TR-101');
    expect(result.evidence).toMatchObject({
      actorId: 'warehouse-administrator',
      userId: 'u-2',
      warehouseId: warehouseA,
      origin: 'SUPPLIER_RESERVED',
      reason: 'Corrected registration after carrier confirmation',
      changedFields: ['tractorRegistration'],
    });
  });

  it('allows System Administrator changes across warehouse scope', () => {
    const result = applyAdministratorTransportChange({
      actor: systemAdministrator,
      warehouse: warehouseScopeB,
      origin: 'IMPORTED',
      current: {},
      next: { trailerOrContainerRegistration: 'CONT-20' },
      reason: 'Resolved imported transport data',
    });

    expect(result.details).toEqual({
      tractorRegistration: '',
      trailerOrContainerRegistration: 'CONT-20',
    });
  });

  it('fails closed for unauthorized actors, wrong warehouse and missing reason', () => {
    const request = {
      warehouse: warehouseScopeA,
      origin: 'ADMIN_ADDED' as const,
      current: {},
      next: { tractorRegistration: 'TR-100' },
      reason: 'Manual correction',
    };

    expect(() => applyAdministratorTransportChange({
      ...request,
      actor: warehouseOperator,
    })).toThrow('cannot change transport data');

    expect(() => applyAdministratorTransportChange({
      ...request,
      actor: warehouseAdministrator,
      warehouse: warehouseScopeB,
    })).toThrow('cannot change transport data');

    expect(() => applyAdministratorTransportChange({
      ...request,
      actor: systemAdministrator,
      reason: '   ',
    })).toThrow('requires a reason');
  });

  it('never permits an Administrator change to remove a required Supplier identifier', () => {
    expect(() => applyAdministratorTransportChange({
      actor: systemAdministrator,
      warehouse: warehouseScopeA,
      origin: 'SUPPLIER_RESERVED',
      current: {
        tractorRegistration: 'TR-100',
        trailerOrContainerRegistration: 'TRL-200',
      },
      next: {
        tractorRegistration: '',
        trailerOrContainerRegistration: 'TRL-200',
      },
      reason: 'Attempted removal',
    })).toThrow('must retain both required identifiers');
  });
});
