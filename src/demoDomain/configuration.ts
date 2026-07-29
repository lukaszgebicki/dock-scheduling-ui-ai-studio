import {
  demoSupplierAssignments,
  demoSupplierOrganizations,
  demoWarehouses,
  type DemoActor,
  type DemoUserId,
  type SupplierOrganizationId,
  type WarehouseId,
} from './demoDomain';

declare const dockIdBrand: unique symbol;
declare const capacityPoolIdBrand: unique symbol;
declare const blockIdBrand: unique symbol;
declare const historyEntryIdBrand: unique symbol;

export type DockId = string & { readonly [dockIdBrand]: 'DockId' };
export type CapacityPoolId = string & { readonly [capacityPoolIdBrand]: 'CapacityPoolId' };
export type BlockId = string & { readonly [blockIdBrand]: 'BlockId' };
export type ConfigurationHistoryEntryId =
  string & { readonly [historyEntryIdBrand]: 'ConfigurationHistoryEntryId' };

export const deliveryFlows = ['Material Delivery', 'Finished Goods Pickup'] as const;
export type DeliveryFlow = (typeof deliveryFlows)[number];

export const supplierFormFields = [
  'purchase-order',
  'asn',
  'vehicle-registration',
  'driver-name',
  'document-reference',
] as const;
export type SupplierFormField = (typeof supplierFormFields)[number];

export const approvalModes = ['auto', 'manual', 'rule-based'] as const;
export type ApprovalMode = (typeof approvalModes)[number];

export const supplierApprovalModes = ['inherit', 'auto', 'manual'] as const;
export type SupplierApprovalMode = (typeof supplierApprovalModes)[number];

export const approvalConditions = [
  'delivery-type',
  'supplier',
  'new-or-blocked-supplier',
  'adr',
  'controlled-temperature',
  'missing-document',
  'after-cut-off',
  'volume-over-limit',
  'special-vehicle',
  'missing-purchase-order',
  'capacity-override',
  'unannounced-visit',
] as const;
export type ApprovalCondition = (typeof approvalConditions)[number];

export const blockReasons = [
  'Public Holiday',
  'Maintenance',
  'Shift Break',
  'Safety Inspection',
  'Capacity Reduction',
  'Manual Block',
  'Additional Opening',
  'Other',
] as const;
export type BlockReason = (typeof blockReasons)[number];

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface WorkingDay {
  weekday: Weekday;
  enabled: boolean;
  opensAt: string;
  closesAt: string;
}

export interface DockConfiguration {
  id: DockId;
  name: string;
  active: boolean;
  zone: string;
  capabilities: readonly string[];
  allowedFlows: readonly DeliveryFlow[];
  supportsAdr: boolean;
  supportsControlledTemperature: boolean;
  supportsContainers: boolean;
}

export interface CapacityPoolConfiguration {
  id: CapacityPoolId;
  name: string;
  concurrentVehicles: number;
  dockIds: readonly DockId[];
}

export type BlockScope =
  | { type: 'warehouse' }
  | { type: 'zone'; zone: string }
  | { type: 'dock'; dockId: DockId }
  | { type: 'capacity-pool'; capacityPoolId: CapacityPoolId };

export type BlockSchedule =
  | {
    kind: 'one-time';
    date: string;
    allDay: boolean;
    startsAt: string;
    endsAt: string;
  }
  | {
    kind: 'recurring';
    weekdays: readonly Weekday[];
    startsAt: string;
    endsAt: string;
  };

export interface WarehouseBlock {
  id: BlockId;
  reasonType: BlockReason;
  reason: string;
  scope: BlockScope;
  schedule: BlockSchedule;
}

export interface WarehouseConfiguration {
  id: WarehouseId;
  displayName: string;
  status: 'draft' | 'published' | 'inactive';
  address: string;
  country: string;
  timezone: string;
  contact: string;
  instructions: string;
  earlyArrivalToleranceMinutes: number;
  lateArrivalToleranceMinutes: number;
  noShowThresholdMinutes: number;
  workingDays: readonly WorkingDay[];
  docks: readonly DockConfiguration[];
  capacityPools: readonly CapacityPoolConfiguration[];
  availableFlows: readonly DeliveryFlow[];
  requiredFields: Readonly<Record<DeliveryFlow, readonly SupplierFormField[]>>;
  approvalMode: ApprovalMode;
  activeCriticalRules: readonly ApprovalCondition[];
  cutOffHours: number;
  supplierOrganizationIds: readonly SupplierOrganizationId[];
  administratorUserIds: readonly DemoUserId[];
  blocks: readonly WarehouseBlock[];
}

export interface CriticalRuleOverride {
  condition: ApprovalCondition;
  reason: string;
}

export interface SupplierConfiguration {
  organizationId: SupplierOrganizationId;
  status: 'active' | 'inactive' | 'blocked';
  warehouseIds: readonly WarehouseId[];
  allowedFlows: readonly DeliveryFlow[];
  approvalMode: SupplierApprovalMode;
  restrictions: readonly string[];
  criticalRuleOverrides: readonly CriticalRuleOverride[];
}

export interface ConfigurationHistoryEntry {
  id: ConfigurationHistoryEntryId;
  sequence: number;
  actorId: DemoActor['id'];
  targetType: 'warehouse' | 'supplier' | 'global-rules' | 'block' | 'user-assignment';
  targetId: string;
  changeType: string;
  before: unknown;
  after: unknown;
  reason?: string;
}

export interface DemoConfigurationState {
  warehouses: readonly WarehouseConfiguration[];
  suppliers: readonly SupplierConfiguration[];
  criticalRuleCatalog: readonly ApprovalCondition[];
  history: readonly ConfigurationHistoryEntry[];
  nextHistorySequence: number;
}

export interface AppointmentContractRecord {
  id: string;
  warehouseId: WarehouseId;
  plannedDate: string;
  plannedTime: string;
  status: string;
  dockId?: DockId;
  zone?: string;
  capacityPoolId?: CapacityPoolId;
}

export interface AvailabilityRequest {
  warehouseId: WarehouseId;
  date: string;
  time: string;
  dockId?: DockId;
  zone?: string;
  capacityPoolId?: CapacityPoolId;
  appointments?: readonly AppointmentContractRecord[];
}

export interface AvailabilityContract {
  available: boolean;
  reasons: readonly string[];
  activeDockIds: readonly DockId[];
  configuredCapacity: number;
  calendarConflictAppointmentIds: readonly string[];
}

export interface ApprovalRequest {
  warehouseId: WarehouseId;
  supplierOrganizationId: SupplierOrganizationId;
  flow: DeliveryFlow;
  isAdr: boolean;
  deliveryTypeRequiresApproval?: boolean;
  supplierRequiresApproval?: boolean;
  isNewSupplier?: boolean;
  isControlledTemperature?: boolean;
  hasRequiredDocument?: boolean;
  afterCutOff?: boolean;
  volumeOverLimit?: boolean;
  specialVehicle?: boolean;
  hasPurchaseOrder?: boolean;
  capacityOverride?: boolean;
  unannouncedVisit?: boolean;
}

export interface SupplierBookingContract {
  canBook: boolean;
  canReschedule: boolean;
  message?: string;
  warehouseIds: readonly WarehouseId[];
  allowedFlows: readonly DeliveryFlow[];
  warehouseFlowAssignments: readonly {
    warehouseId: WarehouseId;
    allowedFlows: readonly DeliveryFlow[];
  }[];
}

const weekdays: readonly WorkingDay[] = [
  { weekday: 0, enabled: false, opensAt: '06:00', closesAt: '18:00' },
  { weekday: 1, enabled: true, opensAt: '06:00', closesAt: '18:00' },
  { weekday: 2, enabled: true, opensAt: '06:00', closesAt: '18:00' },
  { weekday: 3, enabled: true, opensAt: '06:00', closesAt: '18:00' },
  { weekday: 4, enabled: true, opensAt: '06:00', closesAt: '18:00' },
  { weekday: 5, enabled: true, opensAt: '06:00', closesAt: '18:00' },
  { weekday: 6, enabled: false, opensAt: '06:00', closesAt: '18:00' },
];

function assertStableConfigurationId(value: string, label: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

export function createDockId(value: string): DockId {
  assertStableConfigurationId(value, 'dock ID');
  return value as DockId;
}

export function createCapacityPoolId(value: string): CapacityPoolId {
  assertStableConfigurationId(value, 'capacity pool ID');
  return value as CapacityPoolId;
}

export function createBlockId(value: string): BlockId {
  assertStableConfigurationId(value, 'block ID');
  return value as BlockId;
}

function createInitialWarehouse(
  id: WarehouseId,
  displayName: string,
  dockCode: string,
  suppliers: readonly SupplierOrganizationId[],
  administratorUserIds: readonly DemoUserId[],
  status: WarehouseConfiguration['status'] = 'published',
  concurrentVehicles = 4,
): WarehouseConfiguration {
  const dockSlug = dockCode.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const initialDockId = createDockId(`${id}-${dockSlug}`);
  return {
    id,
    displayName,
    status,
    address: 'Lubuskie, Poland',
    country: 'Poland',
    timezone: 'Europe/Warsaw',
    contact: 'warehouse@dock.local',
    instructions: 'Report to security before approaching a dock.',
    earlyArrivalToleranceMinutes: 30,
    lateArrivalToleranceMinutes: 15,
    noShowThresholdMinutes: 60,
    workingDays: weekdays,
    docks: [{
      id: initialDockId,
      name: dockCode,
      active: true,
      zone: 'Main',
      capabilities: ['standard'],
      allowedFlows: deliveryFlows,
      supportsAdr: true,
      supportsControlledTemperature: false,
      supportsContainers: true,
    }],
    capacityPools: [{
      id: createCapacityPoolId(`${id}-main-capacity`),
      name: 'Main capacity',
      concurrentVehicles,
      dockIds: [initialDockId],
    }],
    availableFlows: deliveryFlows,
    requiredFields: {
      'Material Delivery': ['purchase-order', 'vehicle-registration'],
      'Finished Goods Pickup': ['vehicle-registration'],
    },
    approvalMode: 'rule-based',
    activeCriticalRules: ['adr'],
    cutOffHours: 12,
    supplierOrganizationIds: suppliers,
    administratorUserIds,
    blocks: [],
  };
}

export function createWarehouseDraftConfiguration(
  id: WarehouseId,
  displayName: string,
): WarehouseConfiguration {
  return createInitialWarehouse(id, displayName, 'Dock 1', [], [], 'draft', 1);
}

export const initialDemoConfiguration: DemoConfigurationState = {
  warehouses: [
    createInitialWarehouse(
      demoWarehouses[0].id,
      demoWarehouses[0].displayName,
      'NK-01',
      ['northstar-packaging', 'vistula-materials'],
      ['u-2'],
    ),
    createInitialWarehouse(
      demoWarehouses[1].id,
      demoWarehouses[1].displayName,
      'ZG-01',
      ['baltic-freight', 'vistula-materials'],
      ['u-1'],
    ),
  ],
  suppliers: demoSupplierOrganizations.map((organization) => ({
    organizationId: organization.id,
    status: 'active',
    warehouseIds: demoSupplierAssignments[organization.id],
    allowedFlows: deliveryFlows,
    approvalMode: 'inherit',
    restrictions: [],
    criticalRuleOverrides: [],
  })),
  criticalRuleCatalog: ['adr', 'controlled-temperature', 'new-or-blocked-supplier', 'missing-document'],
  history: [],
  nextHistorySequence: 1,
};

function historyId(sequence: number): ConfigurationHistoryEntryId {
  return `configuration-history-${sequence.toString().padStart(3, '0')}` as ConfigurationHistoryEntryId;
}

function appendHistory(
  state: DemoConfigurationState,
  entries: readonly Omit<ConfigurationHistoryEntry, 'id' | 'sequence'>[],
): DemoConfigurationState {
  let sequence = state.nextHistorySequence;
  const historyEntries = entries.map((entry) => {
    const completeEntry: ConfigurationHistoryEntry = {
      ...entry,
      id: historyId(sequence),
      sequence,
    };
    sequence += 1;
    return completeEntry;
  });
  return {
    ...state,
    history: [...state.history, ...historyEntries],
    nextHistorySequence: sequence,
  };
}

export function addWarehouseDraft(
  state: DemoConfigurationState,
  warehouse: WarehouseConfiguration,
  actor: DemoActor,
): DemoConfigurationState {
  if (actor.role !== 'System Administrator') {
    throw new Error('Only System Administrator can create a warehouse configuration.');
  }
  if (state.warehouses.some((candidate) => candidate.id === warehouse.id)) {
    throw new Error('A warehouse with this stable ID already exists.');
  }
  const nextState = {
    ...state,
    warehouses: [...state.warehouses, warehouse],
  };
  return appendHistory(nextState, [{
    actorId: actor.id,
    targetType: 'warehouse',
    targetId: warehouse.id,
    changeType: 'warehouse-draft-created',
    before: null,
    after: warehouse,
  }]);
}

function validateWarehouseConfiguration(
  state: DemoConfigurationState,
  warehouse: WarehouseConfiguration,
): void {
  if (!warehouse.workingDays.some((day) => day.enabled)) {
    throw new Error('Enable at least one working day.');
  }
  if (!warehouse.docks.some((dock) => dock.active)) {
    throw new Error('Configure at least one active dock.');
  }
  if (!warehouse.capacityPools.some((pool) => pool.concurrentVehicles > 0)) {
    throw new Error('Configure positive warehouse capacity.');
  }
  if (warehouse.administratorUserIds.length === 0) {
    throw new Error('Assign at least one Warehouse Administrator.');
  }
  if (warehouse.blocks.some((block) => block.reason.trim().length === 0)) {
    throw new Error('Every block requires a reason.');
  }
  if (warehouse.workingDays.some((day) =>
    day.enabled && (!isTime(day.opensAt) || !isTime(day.closesAt) || day.opensAt >= day.closesAt))) {
    throw new Error('Every enabled working day requires a valid opening interval.');
  }
  if (warehouse.blocks.some((block) => !blockHasValidSchedule(block))) {
    throw new Error('Every block requires a valid date or time interval.');
  }
  if (warehouse.blocks.some((block) => !blockHasValidScope(warehouse, block))) {
    throw new Error('Every scoped block must target configured warehouse resources.');
  }
  if (warehouse.activeCriticalRules.some((rule) => !state.criticalRuleCatalog.includes(rule))) {
    throw new Error('Warehouse critical rules must come from the global catalog.');
  }
}

export function publishWarehouseConfiguration(
  state: DemoConfigurationState,
  warehouse: WarehouseConfiguration,
  actor: DemoActor,
  criticalRuleCatalog: readonly ApprovalCondition[] = state.criticalRuleCatalog,
): DemoConfigurationState {
  const previous = state.warehouses.find((candidate) => candidate.id === warehouse.id);
  if (!previous) {
    throw new Error('Unknown warehouse configuration.');
  }
  const isSystemAdministrator = actor.role === 'System Administrator';
  const isAssignedWarehouseAdministrator =
    actor.role === 'Warehouse Administrator'
    && previous.administratorUserIds.includes(actor.userId);
  if (!isSystemAdministrator && !isAssignedWarehouseAdministrator) {
    throw new Error('The active demo actor cannot publish this warehouse configuration.');
  }
  const administratorAssignmentsChanged =
    JSON.stringify(previous.administratorUserIds) !== JSON.stringify(warehouse.administratorUserIds);
  if (!isSystemAdministrator && administratorAssignmentsChanged) {
    throw new Error('Only System Administrator can change Warehouse Administrator assignments.');
  }

  const catalog = isSystemAdministrator ? [...criticalRuleCatalog] : state.criticalRuleCatalog;
  const stateWithCatalog = { ...state, criticalRuleCatalog: catalog };
  const published = { ...warehouse, status: 'published' as const };
  validateWarehouseConfiguration(stateWithCatalog, published);

  const nextState = {
    ...stateWithCatalog,
    warehouses: state.warehouses.map((candidate) =>
      candidate.id === published.id ? published : candidate),
    suppliers: state.suppliers.map((supplier) => {
      const hadAssignment = previous.supplierOrganizationIds.includes(supplier.organizationId);
      const hasAssignment = published.supplierOrganizationIds.includes(supplier.organizationId);
      if (hadAssignment === hasAssignment) return supplier;
      return {
        ...supplier,
        warehouseIds: hasAssignment
          ? [...supplier.warehouseIds, published.id]
          : supplier.warehouseIds.filter((id) => id !== published.id),
      };
    }),
  };
  const newBlocks = published.blocks.filter((block) =>
    !previous.blocks.some((candidate) => candidate.id === block.id));
  const supplierAssignmentsChanged = state.suppliers.filter((supplier) =>
    previous.supplierOrganizationIds.includes(supplier.organizationId)
    !== published.supplierOrganizationIds.includes(supplier.organizationId));
  const entries: Omit<ConfigurationHistoryEntry, 'id' | 'sequence'>[] = [];

  if (isSystemAdministrator
    && JSON.stringify(state.criticalRuleCatalog) !== JSON.stringify(catalog)) {
    entries.push({
      actorId: actor.id,
      targetType: 'global-rules',
      targetId: 'critical-rule-catalog',
      changeType: 'critical-rule-catalog-published',
      before: state.criticalRuleCatalog,
      after: catalog,
    });
  }
  if (administratorAssignmentsChanged) {
    entries.push({
      actorId: actor.id,
      targetType: 'user-assignment',
      targetId: published.id,
      changeType: 'warehouse-administrator-assignment-changed',
      before: previous.administratorUserIds,
      after: published.administratorUserIds,
    });
  }
  supplierAssignmentsChanged.forEach((supplier) => {
    entries.push({
      actorId: actor.id,
      targetType: 'supplier',
      targetId: supplier.organizationId,
      changeType: 'supplier-warehouse-assignment-changed',
      before: supplier.warehouseIds,
      after: nextState.suppliers.find((candidate) =>
        candidate.organizationId === supplier.organizationId)?.warehouseIds ?? [],
    });
  });
  newBlocks.forEach((block) => {
    entries.push({
      actorId: actor.id,
      targetType: 'block',
      targetId: block.id,
      changeType: 'warehouse-block-created',
      before: null,
      after: block,
      reason: block.reason,
    });
  });
  entries.push({
    actorId: actor.id,
    targetType: 'warehouse',
    targetId: published.id,
    changeType: 'warehouse-configuration-published',
    before: previous,
    after: published,
  });
  return appendHistory(nextState, entries);
}

function activeCriticalRulesForSupplier(
  state: DemoConfigurationState,
  supplier: SupplierConfiguration,
): readonly ApprovalCondition[] {
  return state.warehouses
    .filter((warehouse) => supplier.warehouseIds.includes(warehouse.id))
    .flatMap((warehouse) => warehouse.activeCriticalRules)
    .filter((condition, index, all) => all.indexOf(condition) === index);
}

export function publishSupplierConfiguration(
  state: DemoConfigurationState,
  supplier: SupplierConfiguration,
  actor: DemoActor,
): DemoConfigurationState {
  const previous = state.suppliers.find((candidate) =>
    candidate.organizationId === supplier.organizationId);
  if (!previous) {
    throw new Error('Unknown supplier configuration.');
  }
  if (actor.role !== 'System Administrator') {
    throw new Error('Only System Administrator can publish supplier configuration.');
  }
  if (supplier.warehouseIds.length === 0) {
    throw new Error('Assign at least one warehouse.');
  }
  if (supplier.allowedFlows.length === 0) {
    throw new Error('Allow at least one delivery flow.');
  }

  const criticalRules = activeCriticalRulesForSupplier(state, supplier);
  const overrides = supplier.criticalRuleOverrides.filter((override) =>
    criticalRules.includes(override.condition));
  if (overrides.some((override) => override.reason.trim().length === 0)) {
    throw new Error('Every critical-rule override requires a reason.');
  }
  if (supplier.approvalMode === 'auto'
    && criticalRules.length > 0
    && overrides.length !== criticalRules.length) {
    throw new Error('Auto approval requires an explicit override for every active critical rule.');
  }

  const normalized = { ...supplier, criticalRuleOverrides: overrides };
  const nextState = {
    ...state,
    suppliers: state.suppliers.map((candidate) =>
      candidate.organizationId === normalized.organizationId ? normalized : candidate),
    warehouses: state.warehouses.map((warehouse) => {
      const hadAssignment = previous.warehouseIds.includes(warehouse.id);
      const hasAssignment = normalized.warehouseIds.includes(warehouse.id);
      if (hadAssignment === hasAssignment) return warehouse;
      return {
        ...warehouse,
        supplierOrganizationIds: hasAssignment
          ? [...warehouse.supplierOrganizationIds, normalized.organizationId]
          : warehouse.supplierOrganizationIds.filter((id) => id !== normalized.organizationId),
      };
    }),
  };
  const entries: Omit<ConfigurationHistoryEntry, 'id' | 'sequence'>[] = [{
    actorId: actor.id,
    targetType: 'supplier',
    targetId: normalized.organizationId,
    changeType: 'supplier-configuration-published',
    before: previous,
    after: normalized,
  }];
  if (JSON.stringify(previous.warehouseIds) !== JSON.stringify(normalized.warehouseIds)) {
    entries.push({
      actorId: actor.id,
      targetType: 'supplier',
      targetId: normalized.organizationId,
      changeType: 'supplier-warehouse-assignment-changed',
      before: previous.warehouseIds,
      after: normalized.warehouseIds,
    });
  }
  overrides.forEach((override) => {
    const previousOverride = previous.criticalRuleOverrides.find((candidate) =>
      candidate.condition === override.condition && candidate.reason === override.reason);
    if (!previousOverride) {
      entries.push({
        actorId: actor.id,
        targetType: 'supplier',
        targetId: normalized.organizationId,
        changeType: 'critical-rule-override-authorized',
        before: null,
        after: override,
        reason: override.reason,
      });
    }
  });
  return appendHistory(nextState, entries);
}

export function getWarehouseConfiguration(
  state: DemoConfigurationState,
  warehouseId: WarehouseId,
): WarehouseConfiguration | undefined {
  return state.warehouses.find((warehouse) => warehouse.id === warehouseId);
}

export function getSupplierConfiguration(
  state: DemoConfigurationState,
  organizationId: SupplierOrganizationId,
): SupplierConfiguration | undefined {
  return state.suppliers.find((supplier) => supplier.organizationId === organizationId);
}

function timeIsWithin(time: string, startsAt: string, endsAt: string): boolean {
  return time >= startsAt && time < endsAt;
}

function isTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function blockHasValidSchedule(block: WarehouseBlock): boolean {
  if (block.schedule.kind === 'one-time') {
    return /^\d{4}-\d{2}-\d{2}$/.test(block.schedule.date)
      && (block.schedule.allDay
        || (isTime(block.schedule.startsAt)
          && isTime(block.schedule.endsAt)
          && block.schedule.startsAt < block.schedule.endsAt));
  }
  return block.schedule.weekdays.length > 0
    && isTime(block.schedule.startsAt)
    && isTime(block.schedule.endsAt)
    && block.schedule.startsAt < block.schedule.endsAt;
}

function blockHasValidScope(
  warehouse: WarehouseConfiguration,
  block: WarehouseBlock,
): boolean {
  switch (block.scope.type) {
    case 'warehouse':
      return true;
    case 'zone': {
      const zone = block.scope.zone;
      return warehouse.docks.some((dock) => dock.zone === zone);
    }
    case 'dock': {
      const dockId = block.scope.dockId;
      return warehouse.docks.some((dock) => dock.id === dockId);
    }
    case 'capacity-pool': {
      const capacityPoolId = block.scope.capacityPoolId;
      return warehouse.capacityPools.some((pool) => pool.id === capacityPoolId);
    }
  }
}

function blockAffectsRequest(block: WarehouseBlock, request: AvailabilityRequest): boolean {
  const date = new Date(`${request.date}T00:00:00Z`);
  const weekday = date.getUTCDay() as Weekday;
  const scheduleMatches = block.schedule.kind === 'one-time'
    ? block.schedule.date === request.date
      && (block.schedule.allDay
        || timeIsWithin(request.time, block.schedule.startsAt, block.schedule.endsAt))
    : block.schedule.weekdays.includes(weekday)
      && timeIsWithin(request.time, block.schedule.startsAt, block.schedule.endsAt);
  if (!scheduleMatches) return false;

  switch (block.scope.type) {
    case 'warehouse':
      return true;
    case 'zone':
      return block.scope.zone === request.zone;
    case 'dock':
      return block.scope.dockId === request.dockId;
    case 'capacity-pool':
      return block.scope.capacityPoolId === request.capacityPoolId;
  }
}

export function deriveAvailabilityContract(
  state: DemoConfigurationState,
  request: AvailabilityRequest,
): AvailabilityContract {
  const warehouse = getWarehouseConfiguration(state, request.warehouseId);
  if (!warehouse || warehouse.status !== 'published') {
    return {
      available: false,
      reasons: ['Warehouse configuration is not published.'],
      activeDockIds: [],
      configuredCapacity: 0,
      calendarConflictAppointmentIds: [],
    };
  }
  const date = new Date(`${request.date}T00:00:00Z`);
  const weekday = date.getUTCDay() as Weekday;
  const workingDay = warehouse.workingDays.find((day) => day.weekday === weekday);
  const activeDocks = warehouse.docks.filter((dock) => dock.active);
  const configuredCapacity = warehouse.capacityPools.reduce(
    (total, pool) => total + pool.concurrentVehicles,
    0,
  );
  const affectingBlocks = warehouse.blocks.filter((block) => blockAffectsRequest(block, request));
  const reasons: string[] = [];
  if (!workingDay?.enabled
    || !timeIsWithin(request.time, workingDay.opensAt, workingDay.closesAt)) {
    reasons.push('Outside configured working hours.');
  }
  if (activeDocks.length === 0) reasons.push('No active docks.');
  if (configuredCapacity <= 0) reasons.push('No configured capacity.');
  if (affectingBlocks.length > 0) reasons.push('A configured block affects this time.');

  const calendarConflictAppointmentIds = affectingBlocks.length === 0
    ? []
    : (request.appointments ?? [])
      .filter((appointment) =>
        appointment.warehouseId === request.warehouseId
        && appointment.plannedDate === request.date
        && appointment.status !== 'Cancelled'
        && affectingBlocks.some((block) => blockAffectsRequest(block, {
          warehouseId: appointment.warehouseId,
          date: appointment.plannedDate,
          time: appointment.plannedTime,
          dockId: appointment.dockId,
          zone: appointment.zone,
          capacityPoolId: appointment.capacityPoolId,
        })))
      .map((appointment) => appointment.id);

  return {
    available: reasons.length === 0,
    reasons,
    activeDockIds: activeDocks.map((dock) => dock.id),
    configuredCapacity,
    calendarConflictAppointmentIds,
  };
}

export function deriveSupplierFormContract(
  state: DemoConfigurationState,
  warehouseId: WarehouseId,
  flow: DeliveryFlow,
): { requiredFields: readonly SupplierFormField[]; cutOffHours: number } {
  const warehouse = getWarehouseConfiguration(state, warehouseId);
  const flowIsAvailable = warehouse?.status === 'published'
    && warehouse.availableFlows.includes(flow);
  return {
    requiredFields: flowIsAvailable ? warehouse.requiredFields[flow] : [],
    cutOffHours: flowIsAvailable ? warehouse.cutOffHours : 0,
  };
}

function approvalConditionMatches(
  condition: ApprovalCondition,
  request: ApprovalRequest,
  supplier: SupplierConfiguration,
): boolean {
  switch (condition) {
    case 'delivery-type':
      return request.deliveryTypeRequiresApproval === true;
    case 'supplier':
      return request.supplierRequiresApproval === true;
    case 'new-or-blocked-supplier':
      return request.isNewSupplier === true || supplier.status !== 'active';
    case 'adr':
      return request.isAdr;
    case 'controlled-temperature':
      return request.isControlledTemperature === true;
    case 'missing-document':
      return request.hasRequiredDocument === false;
    case 'after-cut-off':
      return request.afterCutOff === true;
    case 'volume-over-limit':
      return request.volumeOverLimit === true;
    case 'special-vehicle':
      return request.specialVehicle === true;
    case 'missing-purchase-order':
      return request.hasPurchaseOrder === false;
    case 'capacity-override':
      return request.capacityOverride === true;
    case 'unannounced-visit':
      return request.unannouncedVisit === true;
  }
}

export function evaluateApproval(
  state: DemoConfigurationState,
  request: ApprovalRequest,
): 'auto' | 'manual' {
  const warehouse = getWarehouseConfiguration(state, request.warehouseId);
  const supplier = getSupplierConfiguration(state, request.supplierOrganizationId);
  if (!warehouse || !supplier || warehouse.status !== 'published') return 'manual';
  if (!warehouse.availableFlows.includes(request.flow)
    || !supplier.allowedFlows.includes(request.flow)
    || !supplier.warehouseIds.includes(request.warehouseId)) return 'manual';
  if (supplier.approvalMode === 'manual' || warehouse.approvalMode === 'manual') return 'manual';

  const conditions = approvalConditions.filter((condition) =>
    approvalConditionMatches(condition, request, supplier));

  const unoverriddenCriticalCondition = conditions.some((condition) =>
    warehouse.activeCriticalRules.includes(condition)
    && !supplier.criticalRuleOverrides.some((override) => override.condition === condition));
  if (unoverriddenCriticalCondition) return 'manual';
  if (supplier.approvalMode === 'auto') return 'auto';
  if (warehouse.approvalMode === 'auto') return 'auto';
  return conditions.length > 0 ? 'manual' : 'auto';
}

export function deriveSupplierBookingContract(
  state: DemoConfigurationState,
  organizationId: SupplierOrganizationId,
): SupplierBookingContract {
  const supplier = getSupplierConfiguration(state, organizationId);
  if (!supplier) {
    return {
      canBook: false,
      canReschedule: false,
      message: 'Supplier configuration is unavailable.',
      warehouseIds: [],
      allowedFlows: [],
      warehouseFlowAssignments: [],
    };
  }
  const warehouseFlowAssignments = state.warehouses
    .filter((warehouse) =>
      supplier.warehouseIds.includes(warehouse.id) && warehouse.status === 'published')
    .map((warehouse) => ({
      warehouseId: warehouse.id,
      allowedFlows: supplier.allowedFlows.filter((flow) =>
        warehouse.availableFlows.includes(flow)),
    }));
  const allowedFlows = deliveryFlows.filter((flow) =>
    warehouseFlowAssignments.some((assignment) => assignment.allowedFlows.includes(flow)));
  if (supplier.status === 'blocked') {
    return {
      canBook: false,
      canReschedule: false,
      message: 'This supplier organization is blocked. Administrator decision is required.',
      warehouseIds: supplier.warehouseIds,
      allowedFlows,
      warehouseFlowAssignments,
    };
  }
  if (supplier.status === 'inactive') {
    return {
      canBook: false,
      canReschedule: false,
      message: 'This supplier organization is inactive.',
      warehouseIds: supplier.warehouseIds,
      allowedFlows,
      warehouseFlowAssignments,
    };
  }
  if (!warehouseFlowAssignments.some((assignment) => assignment.allowedFlows.length > 0)) {
    return {
      canBook: false,
      canReschedule: false,
      message: 'No assigned warehouse accepts an allowed supplier flow.',
      warehouseIds: supplier.warehouseIds,
      allowedFlows,
      warehouseFlowAssignments,
    };
  }
  return {
    canBook: true,
    canReschedule: true,
    warehouseIds: supplier.warehouseIds,
    allowedFlows,
    warehouseFlowAssignments,
  };
}
