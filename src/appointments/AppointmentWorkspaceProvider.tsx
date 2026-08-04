import React, { createContext, useContext, useMemo, useState } from 'react';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import {
  addWorkspaceComment,
  createInitialAppointmentWorkspaceState,
  saveWorkspaceView,
  savedViewsForActor,
  setDefaultWorkspaceView,
  updateWorkspaceField,
  withSavedViews,
  type AppointmentWorkspaceRecord,
  type AppointmentWorkspaceState,
  type WorkspaceColumnId,
  type WorkspaceCommentVisibility,
  type WorkspaceFilters,
  type WorkspaceSafeField,
  type WorkspaceSavedView,
} from './appointmentWorkspace';

interface AppointmentWorkspaceContextValue {
  state: AppointmentWorkspaceState;
  records: readonly AppointmentWorkspaceRecord[];
  visibleRecords: readonly AppointmentWorkspaceRecord[];
  savedViews: readonly WorkspaceSavedView[];
  getRecord: (id: string) => AppointmentWorkspaceRecord | null;
  getVisibleRecord: (id: string) => AppointmentWorkspaceRecord | null;
  addRecord: (record: AppointmentWorkspaceRecord) => string | null;
  updateField: (
    recordId: string,
    field: WorkspaceSafeField,
    nextValue: string,
    reason: string,
  ) => string | null;
  addComment: (
    recordId: string,
    visibility: WorkspaceCommentVisibility | '',
    text: string,
    reason: string,
  ) => string | null;
  saveView: (
    name: string,
    filters: WorkspaceFilters,
    columns: readonly WorkspaceColumnId[],
  ) => { error: string | null; savedView: WorkspaceSavedView | null };
  setDefaultView: (viewId: string) => string | null;
}

const defaultState = createInitialAppointmentWorkspaceState();

const AppointmentWorkspaceContext = createContext<AppointmentWorkspaceContextValue>({
  state: defaultState,
  records: defaultState.records,
  visibleRecords: [],
  savedViews: [],
  getRecord: () => null,
  getVisibleRecord: () => null,
  addRecord: () => 'Appointment workspace provider is missing.',
  updateField: () => 'Appointment workspace provider is missing.',
  addComment: () => 'Appointment workspace provider is missing.',
  saveView: () => ({
    error: 'Appointment workspace provider is missing.',
    savedView: null,
  }),
  setDefaultView: () => 'Appointment workspace provider is missing.',
});

export function AppointmentWorkspaceProvider({
  children,
  initialState = createInitialAppointmentWorkspaceState(),
}: {
  children: React.ReactNode;
  initialState?: AppointmentWorkspaceState;
}) {
  const {
    activeActor,
    canViewAppointment,
    configuration,
  } = useDemoDomain();
  const [state, setState] = useState<AppointmentWorkspaceState>(initialState);

  const visibleRecords = useMemo(() => state.records.filter((record) =>
    canViewAppointment(record)), [canViewAppointment, state.records]);
  const savedViews = useMemo(() => savedViewsForActor(
    state.savedViews,
    activeActor,
  ), [activeActor, state.savedViews]);

  const getRecord = (id: string) =>
    state.records.find((record) => record.id === id) ?? null;
  const getVisibleRecord = (id: string) =>
    visibleRecords.find((record) => record.id === id) ?? null;

  const addRecord = (record: AppointmentWorkspaceRecord): string | null => {
    const isSupplier = activeActor.role === 'Supplier Administrator'
      || activeActor.role === 'Supplier User';
    if (!isSupplier
      || !activeActor.supplierOrganizationId
      || record.supplierOrganizationId !== activeActor.supplierOrganizationId
      || !canViewAppointment(record)) {
      return 'The active actor cannot add this appointment to the workspace.';
    }
    const duplicate = state.records.some((candidate) =>
      candidate.id === record.id
      || (candidate.supplierOrganizationId === record.supplierOrganizationId
        && candidate.warehouseId === record.warehouseId
        && candidate.externalReference.toLocaleLowerCase('en-US')
          === record.externalReference.toLocaleLowerCase('en-US')
        && candidate.plannedDate === record.plannedDate
        && candidate.plannedTime === record.plannedTime));
    if (duplicate) return 'This local standard booking is already present in the workspace.';
    setState((current) => ({ ...current, records: [...current.records, record] }));
    return null;
  };

  const updateField = (
    recordId: string,
    field: WorkspaceSafeField,
    nextValue: string,
    reason: string,
  ): string | null => {
    const record = getRecord(recordId);
    const warehouse = record
      ? configuration.warehouses.find((candidate) =>
        candidate.id === record.warehouseId)
      : undefined;
    if (!record || !warehouse) return 'Appointment or warehouse configuration is missing.';
    const result = updateWorkspaceField(
      state,
      recordId,
      activeActor,
      canViewAppointment(record),
      warehouse,
      field,
      nextValue,
      reason,
    );
    if (!result.error) setState(result.state);
    return result.error;
  };

  const addComment = (
    recordId: string,
    visibility: WorkspaceCommentVisibility | '',
    text: string,
    reason: string,
  ): string | null => {
    const record = getRecord(recordId);
    const result = addWorkspaceComment(
      state,
      recordId,
      activeActor,
      Boolean(record && canViewAppointment(record)),
      visibility,
      text,
      reason,
    );
    if (!result.error) setState(result.state);
    return result.error;
  };

  const saveView = (
    name: string,
    filters: WorkspaceFilters,
    columns: readonly WorkspaceColumnId[],
  ) => {
    const result = saveWorkspaceView(
      state.savedViews,
      activeActor,
      name,
      filters,
      columns,
    );
    if (!result.error) setState(withSavedViews(state, result.views));
    return { error: result.error, savedView: result.savedView };
  };

  const setDefaultView = (viewId: string): string | null => {
    const result = setDefaultWorkspaceView(
      state.savedViews,
      activeActor,
      viewId,
    );
    if (!result.error) setState(withSavedViews(state, result.views));
    return result.error;
  };

  return (
    <AppointmentWorkspaceContext.Provider value={{
      state,
      records: state.records,
      visibleRecords,
      savedViews,
      getRecord,
      getVisibleRecord,
      addRecord,
      updateField,
      addComment,
      saveView,
      setDefaultView,
    }}>
      {children}
    </AppointmentWorkspaceContext.Provider>
  );
}

export function useAppointmentWorkspace(): AppointmentWorkspaceContextValue {
  return useContext(AppointmentWorkspaceContext);
}
