import React, { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { ArrowLeft, CheckCircle2, Plus, Settings } from 'lucide-react';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import {
  approvalConditions,
  blockReasons,
  createBlockId,
  createCapacityPoolId,
  createDockId,
  deliveryFlows,
  supplierFormFields,
  type ApprovalCondition,
  type BlockScope,
  type DeliveryFlow,
  type SupplierFormField,
  type WarehouseBlock,
  type WarehouseConfiguration,
  type Weekday,
} from '../demoDomain/configuration';
import {
  asWarehouseId,
  demoSupplierOrganizations,
  demoUsers,
  type DemoUserId,
} from '../demoDomain/demoDomain';

const weekdayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function replaceArrayValue<T>(
  values: readonly T[],
  value: T,
  checked: boolean,
): readonly T[] {
  return checked
    ? values.includes(value) ? values : [...values, value]
    : values.filter((candidate) => candidate !== value);
}

function WarehouseConfigurationEditor({
  initialWarehouse,
}: {
  initialWarehouse: WarehouseConfiguration;
}) {
  const {
    activeActor,
    configuration,
    publishWarehouse,
  } = useDemoDomain();
  const [warehouse, setWarehouse] = useState(initialWarehouse);
  const [criticalRuleCatalog, setCriticalRuleCatalog] = useState(
    configuration.criticalRuleCatalog,
  );
  const [newDockName, setNewDockName] = useState('');
  const [blockReasonType, setBlockReasonType] = useState<(typeof blockReasons)[number]>(
    'Maintenance',
  );
  const [blockReason, setBlockReason] = useState('');
  const [blockDate, setBlockDate] = useState('2026-07-28');
  const [blockStartsAt, setBlockStartsAt] = useState('08:00');
  const [blockEndsAt, setBlockEndsAt] = useState('09:00');
  const [blockScopeType, setBlockScopeType] = useState<BlockScope['type']>('warehouse');
  const [blockScopeTarget, setBlockScopeTarget] = useState('');
  const [blockRecurring, setBlockRecurring] = useState(false);
  const [blockRecurringWeekdays, setBlockRecurringWeekdays] =
    useState<readonly Weekday[]>([1, 2, 3, 4, 5]);
  const [blockAllDay, setBlockAllDay] = useState(false);
  const [error, setError] = useState('');
  const [published, setPublished] = useState(false);

  const updateWorkingDay = (
    weekday: Weekday,
    update: Partial<WarehouseConfiguration['workingDays'][number]>,
  ) => {
    setWarehouse((current) => ({
      ...current,
      workingDays: current.workingDays.map((day) =>
        day.weekday === weekday ? { ...day, ...update } : day),
    }));
  };

  const updateRequiredField = (
    flow: DeliveryFlow,
    field: SupplierFormField,
    checked: boolean,
  ) => {
    setWarehouse((current) => ({
      ...current,
      requiredFields: {
        ...current.requiredFields,
        [flow]: replaceArrayValue(current.requiredFields[flow], field, checked),
      },
    }));
  };

  const addDock = () => {
    const name = newDockName.trim();
    if (!name) {
      setError('Enter a dock name.');
      return;
    }
    const dockSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!dockSlug) {
      setError('Enter a dock name that produces a stable ID.');
      return;
    }
    const id = createDockId(`${warehouse.id}-${dockSlug}`);
    if (warehouse.docks.some((dock) => dock.id === id)) {
      setError('A dock with this stable ID already exists.');
      return;
    }
    setWarehouse((current) => ({
      ...current,
      docks: [...current.docks, {
        id,
        name,
        active: true,
        zone: 'Main',
        capabilities: ['standard'],
        allowedFlows: current.availableFlows,
        supportsAdr: true,
        supportsControlledTemperature: false,
        supportsContainers: true,
      }],
      capacityPools: current.capacityPools.map((pool, index) =>
        index === 0 ? { ...pool, dockIds: [...pool.dockIds, id] } : pool),
    }));
    setNewDockName('');
    setError('');
  };

  const getBlockScope = (): BlockScope | undefined => {
    switch (blockScopeType) {
      case 'zone':
        return blockScopeTarget ? { type: 'zone', zone: blockScopeTarget } : undefined;
      case 'dock':
        return blockScopeTarget
          ? { type: 'dock', dockId: createDockId(blockScopeTarget) }
          : undefined;
      case 'capacity-pool':
        return blockScopeTarget
          ? { type: 'capacity-pool', capacityPoolId: createCapacityPoolId(blockScopeTarget) }
          : undefined;
      default:
        return { type: 'warehouse' };
    }
  };

  const addBlock = () => {
    if (!blockReason.trim()) {
      setError('Enter a reason for the block.');
      return;
    }
    const scope = getBlockScope();
    if (!scope) {
      setError('Select a block target.');
      return;
    }
    if (blockRecurring && blockRecurringWeekdays.length === 0) {
      setError('Select at least one recurring weekday.');
      return;
    }
    if (!blockRecurring && !/^\d{4}-\d{2}-\d{2}$/.test(blockDate)) {
      setError('Select a valid block date.');
      return;
    }
    if ((blockRecurring || !blockAllDay)
      && (!blockStartsAt || !blockEndsAt || blockStartsAt >= blockEndsAt)) {
      setError('Block start time must be earlier than end time.');
      return;
    }
    const scheduleId = blockRecurring
      ? `recurring-${blockRecurringWeekdays.join('')}`
      : blockDate;
    const block: WarehouseBlock = {
      id: createBlockId(
        `${warehouse.id}-${blockReasonType.toLowerCase().replaceAll(' ', '-')}-${scheduleId}-${warehouse.blocks.length + 1}`,
      ),
      reasonType: blockReasonType,
      reason: blockReason.trim(),
      scope,
      schedule: blockRecurring
        ? {
          kind: 'recurring',
          weekdays: blockRecurringWeekdays,
          startsAt: blockStartsAt,
          endsAt: blockEndsAt,
        }
        : {
          kind: 'one-time',
          date: blockDate,
          allDay: blockAllDay,
          startsAt: blockStartsAt,
          endsAt: blockEndsAt,
        },
    };
    setWarehouse((current) => ({ ...current, blocks: [...current.blocks, block] }));
    setBlockReason('');
    setError('');
  };

  const publish = (event: React.FormEvent) => {
    event.preventDefault();
    if (!warehouse.workingDays.some((day) => day.enabled)) {
      setError('Enable at least one working day.');
      return;
    }
    if (warehouse.workingDays.some((day) =>
      day.enabled && (!day.opensAt || !day.closesAt || day.opensAt >= day.closesAt))) {
      setError('Every enabled working day requires a valid opening interval.');
      return;
    }
    if (!warehouse.docks.some((dock) => dock.active)) {
      setError('Configure at least one active dock.');
      return;
    }
    if (warehouse.administratorUserIds.length === 0) {
      setError('Assign at least one Warehouse Administrator.');
      return;
    }
    if (warehouse.activeCriticalRules.some((rule) => !criticalRuleCatalog.includes(rule))) {
      setError('Remove inactive warehouse rules before publishing the global catalog.');
      return;
    }
    const nextWarehouse = { ...warehouse, status: 'published' as const };
    publishWarehouse(nextWarehouse, criticalRuleCatalog);
    setWarehouse(nextWarehouse);
    setPublished(true);
    setError('');
  };

  const warehouseHistory = configuration.history.filter((entry) =>
    entry.targetId === warehouse.id
    || (entry.targetType === 'block'
      && warehouse.blocks.some((block) => block.id === entry.targetId)));
  const zoneOptions = warehouse.docks
    .map((dock) => dock.zone)
    .filter((zone, index, zones) => zones.indexOf(zone) === index);

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        to="/warehouses"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-[#023466] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to warehouses
      </Link>

      <header className="mb-8 sm:flex sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Configure {warehouse.displayName}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Published changes stay in demo memory only and reset on reload.
          </p>
        </div>
        <span className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-medium capitalize text-blue-700 sm:mt-0">
          {warehouse.status}
        </span>
      </header>

      {published && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800" role="status">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          Configuration published in local demo state.
        </div>
      )}
      {error && (
        <p className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={publish} className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#000A32]">Warehouse settings</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-medium text-gray-700">
              Timezone
              <input
                value={warehouse.timezone}
                onChange={(event) => setWarehouse((current) => ({
                  ...current,
                  timezone: event.target.value,
                }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Cut-off hours
              <input
                type="number"
                min="0"
                value={warehouse.cutOffHours}
                onChange={(event) => setWarehouse((current) => ({
                  ...current,
                  cutOffHours: Number(event.target.value),
                }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Early arrival tolerance
              <input
                type="number"
                min="0"
                value={warehouse.earlyArrivalToleranceMinutes}
                onChange={(event) => setWarehouse((current) => ({
                  ...current,
                  earlyArrivalToleranceMinutes: Number(event.target.value),
                }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              No-show threshold
              <input
                type="number"
                min="0"
                value={warehouse.noShowThresholdMinutes}
                onChange={(event) => setWarehouse((current) => ({
                  ...current,
                  noShowThresholdMinutes: Number(event.target.value),
                }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#000A32]">Working schedule</h2>
          <div className="mt-4 grid gap-3">
            {warehouse.workingDays.map((day) => (
              <div key={day.weekday} className="grid items-center gap-3 rounded-lg bg-gray-50 p-3 sm:grid-cols-[10rem_1fr_1fr]">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(event) => updateWorkingDay(day.weekday, { enabled: event.target.checked })}
                  />
                  {weekdayLabels[day.weekday]}
                </label>
                <label className="text-sm text-gray-600">
                  Opens
                  <input
                    type="time"
                    value={day.opensAt}
                    onChange={(event) => updateWorkingDay(day.weekday, { opensAt: event.target.value })}
                    className="ml-2 rounded-md border border-gray-300 px-2 py-1"
                  />
                </label>
                <label className="text-sm text-gray-600">
                  Closes
                  <input
                    type="time"
                    value={day.closesAt}
                    onChange={(event) => updateWorkingDay(day.weekday, { closesAt: event.target.value })}
                    className="ml-2 rounded-md border border-gray-300 px-2 py-1"
                  />
                </label>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#000A32]">Docks and capacity</h2>
          <div className="mt-4 space-y-3">
            {warehouse.docks.map((dock) => (
              <label key={dock.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <span>
                  <span className="block text-sm font-medium text-gray-900">{dock.name}</span>
                  <span className="font-mono text-xs text-gray-500">{dock.id}</span>
                </span>
                <span className="flex items-center gap-2 text-sm text-gray-600">
                  Active
                  <input
                    type="checkbox"
                    checked={dock.active}
                    onChange={(event) => setWarehouse((current) => ({
                      ...current,
                      docks: current.docks.map((candidate) =>
                        candidate.id === dock.id
                          ? { ...candidate, active: event.target.checked }
                          : candidate),
                    }))}
                  />
                </span>
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label className="flex-1 text-sm font-medium text-gray-700">
              New dock name
              <input
                value={newDockName}
                onChange={(event) => setNewDockName(event.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </label>
            <button
              type="button"
              onClick={addDock}
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-[#023466]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add dock
            </button>
          </div>
          <label className="mt-5 block max-w-xs text-sm font-medium text-gray-700">
            Concurrent vehicle capacity
            <input
              type="number"
              min="1"
              value={warehouse.capacityPools[0]?.concurrentVehicles ?? 0}
              onChange={(event) => setWarehouse((current) => ({
                ...current,
                capacityPools: current.capacityPools.map((pool, index) =>
                  index === 0
                    ? { ...pool, concurrentVehicles: Number(event.target.value) }
                    : pool),
              }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </label>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#000A32]">Flows and required fields</h2>
            {deliveryFlows.map((flow) => (
              <fieldset key={flow} className="mt-5">
                <legend className="text-sm font-semibold text-gray-800">{flow}</legend>
                <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={warehouse.availableFlows.includes(flow)}
                    onChange={(event) => setWarehouse((current) => ({
                      ...current,
                      availableFlows: replaceArrayValue(
                        current.availableFlows,
                        flow,
                        event.target.checked,
                      ),
                    }))}
                  />
                  Flow available
                </label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {supplierFormFields.map((field) => (
                    <label key={field} className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={warehouse.requiredFields[flow].includes(field)}
                        onChange={(event) => updateRequiredField(flow, field, event.target.checked)}
                      />
                      {field}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#000A32]">Approval configuration</h2>
            <label className="mt-4 block text-sm font-medium text-gray-700">
              Approval mode
              <select
                value={warehouse.approvalMode}
                onChange={(event) => setWarehouse((current) => ({
                  ...current,
                  approvalMode: event.target.value as WarehouseConfiguration['approvalMode'],
                }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="auto">Auto approve</option>
                <option value="manual">Manual approve</option>
                <option value="rule-based">Rule based</option>
              </select>
            </label>
            <fieldset className="mt-5">
              <legend className="text-sm font-semibold text-gray-800">Active critical rules</legend>
              <div className="mt-2 grid gap-2">
                {criticalRuleCatalog.map((condition) => (
                  <label key={condition} className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={warehouse.activeCriticalRules.includes(condition)}
                      onChange={(event) => setWarehouse((current) => ({
                        ...current,
                        activeCriticalRules: replaceArrayValue(
                          current.activeCriticalRules,
                          condition,
                          event.target.checked,
                        ),
                      }))}
                    />
                    {condition}
                  </label>
                ))}
              </div>
            </fieldset>
            {activeActor.role === 'System Administrator' && (
              <fieldset className="mt-5 border-t border-gray-200 pt-5">
                <legend className="text-sm font-semibold text-gray-800">
                  Global critical-rule catalog
                </legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {approvalConditions.map((condition) => (
                    <label key={condition} className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={criticalRuleCatalog.includes(condition)}
                        onChange={(event) => setCriticalRuleCatalog((current) =>
                          replaceArrayValue(current, condition, event.target.checked) as ApprovalCondition[])}
                      />
                      {condition}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#000A32]">Assignments</h2>
            {activeActor.role === 'System Administrator' && (
              <fieldset className="mt-4">
                <legend className="text-sm font-semibold text-gray-800">Warehouse Administrators</legend>
                {demoUsers.filter((user) => user.role === 'Warehouse Administrator').map((user) => (
                  <label key={user.id} className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={warehouse.administratorUserIds.includes(user.id as DemoUserId)}
                      onChange={(event) => setWarehouse((current) => ({
                        ...current,
                        administratorUserIds: replaceArrayValue(
                          current.administratorUserIds,
                          user.id as DemoUserId,
                          event.target.checked,
                        ),
                      }))}
                    />
                    {user.fullName}
                  </label>
                ))}
              </fieldset>
            )}
            <fieldset className="mt-5">
              <legend className="text-sm font-semibold text-gray-800">Assigned suppliers</legend>
              {demoSupplierOrganizations.map((supplier) => (
                <label key={supplier.id} className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={warehouse.supplierOrganizationIds.includes(supplier.id)}
                    onChange={(event) => setWarehouse((current) => ({
                      ...current,
                      supplierOrganizationIds: replaceArrayValue(
                        current.supplierOrganizationIds,
                        supplier.id,
                        event.target.checked,
                      ),
                    }))}
                  />
                  {supplier.displayName}
                </label>
              ))}
            </fieldset>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#000A32]">Add block</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-gray-700">
                Block type
                <select
                  value={blockReasonType}
                  onChange={(event) => setBlockReasonType(event.target.value as typeof blockReasonType)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  {blockReasons.map((reason) => <option key={reason}>{reason}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-gray-700">
                Block scope
                <select
                  value={blockScopeType}
                  onChange={(event) => {
                    setBlockScopeType(event.target.value as BlockScope['type']);
                    setBlockScopeTarget('');
                  }}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="warehouse">Whole warehouse</option>
                  <option value="zone">Zone</option>
                  <option value="dock">Dock</option>
                  <option value="capacity-pool">Capacity pool</option>
                </select>
              </label>
              {blockScopeType !== 'warehouse' && (
                <label className="text-sm font-medium text-gray-700">
                  Block target
                  <select
                    value={blockScopeTarget}
                    onChange={(event) => setBlockScopeTarget(event.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="">Select...</option>
                    {blockScopeType === 'zone' && zoneOptions.map((zone) =>
                      <option key={zone} value={zone}>{zone}</option>)}
                    {blockScopeType === 'dock' && warehouse.docks.map((dock) =>
                      <option key={dock.id} value={dock.id}>{dock.name}</option>)}
                    {blockScopeType === 'capacity-pool' && warehouse.capacityPools.map((pool) =>
                      <option key={pool.id} value={pool.id}>{pool.name}</option>)}
                  </select>
                </label>
              )}
              {!blockRecurring && (
                <label className="text-sm font-medium text-gray-700">
                  Date
                  <input
                    type="date"
                    value={blockDate}
                    onChange={(event) => setBlockDate(event.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </label>
              )}
              <label className="flex items-end gap-2 pb-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={blockRecurring}
                  onChange={(event) => setBlockRecurring(event.target.checked)}
                />
                Recurring schedule
              </label>
              {blockRecurring ? (
                <fieldset className="sm:col-span-2">
                  <legend className="text-sm font-medium text-gray-700">Recurring weekdays</legend>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {weekdayLabels.map((label, weekday) => (
                      <label key={label} className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={blockRecurringWeekdays.includes(weekday as Weekday)}
                          onChange={(event) => setBlockRecurringWeekdays((current) =>
                            replaceArrayValue(
                              current,
                              weekday as Weekday,
                              event.target.checked,
                            ))}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <label className="flex items-end gap-2 pb-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={blockAllDay}
                    onChange={(event) => setBlockAllDay(event.target.checked)}
                  />
                  All day
                </label>
              )}
              {(blockRecurring || !blockAllDay) && (
                <label className="text-sm font-medium text-gray-700">
                  Starts
                  <input
                    type="time"
                    value={blockStartsAt}
                    onChange={(event) => setBlockStartsAt(event.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </label>
              )}
              {(blockRecurring || !blockAllDay) && (
                <label className="text-sm font-medium text-gray-700">
                  Ends
                  <input
                    type="time"
                    value={blockEndsAt}
                    onChange={(event) => setBlockEndsAt(event.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </label>
              )}
              <label className="text-sm font-medium text-gray-700 sm:col-span-2">
                Reason
                <input
                  value={blockReason}
                  onChange={(event) => setBlockReason(event.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={addBlock}
              className="mt-4 inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-[#023466]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add block
            </button>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              {warehouse.blocks.map((block) => (
                <li key={block.id} className="rounded-lg bg-gray-50 p-3">
                  <span className="font-medium">{block.reasonType}</span>: {block.reason}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#000A32]">
            <Settings className="h-5 w-5" aria-hidden="true" />
            Local history
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {warehouseHistory.length === 0
              ? 'No published changes in this mounted demo session.'
              : `${warehouseHistory.length} recorded change${warehouseHistory.length === 1 ? '' : 's'}.`}
          </p>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-md bg-[#000A32] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#023466]"
          >
            Publish configuration
          </button>
        </div>
      </form>
    </div>
  );
}

export function WarehouseConfigurationPage() {
  const { warehouseId = '' } = useParams();
  const { canViewWarehouse, configuration } = useDemoDomain();
  const idIsValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(warehouseId);
  const typedWarehouseId = idIsValid ? asWarehouseId(warehouseId) : undefined;
  const warehouse = typedWarehouseId
    ? configuration.warehouses.find((candidate) => candidate.id === typedWarehouseId)
    : undefined;

  if (!warehouse || !canViewWarehouse(warehouse.id)) {
    return <Navigate to="/warehouses" replace />;
  }
  return <WarehouseConfigurationEditor initialWarehouse={warehouse} />;
}
