import type { AppointmentWorkspaceRecord } from '../appointments/appointmentWorkspace';
import type { DemoActor, UiMvpRole } from '../demoDomain/demoDomain';

export const notificationEvents = [
  'CREATED',
  'SUBMITTED',
  'PENDING_APPROVAL',
  'CONFIRMED',
  'REJECTED',
  'CHANGES_REQUESTED',
  'SLOT_PROPOSED',
  'RESCHEDULED',
  'CANCELLED',
  'REMINDER',
  'MISSING_DATA',
  'LATE_ARRIVAL',
  'NO_SHOW',
  'SHARED_COMMENT',
] as const;
export type NotificationEvent = (typeof notificationEvents)[number];

export const notificationPreferenceKeys = [
  ...notificationEvents,
  'REQUIRED_ACTION',
  'SAFETY',
] as const;
export type NotificationPreferenceKey = (typeof notificationPreferenceKeys)[number];

export const notificationFrequencies = [
  'IMMEDIATE',
  'HOURLY_DIGEST',
  'DAILY_DIGEST',
] as const;
export type NotificationFrequency = (typeof notificationFrequencies)[number];

export type NotificationSeverity = 'INFORMATION' | 'ACTION_REQUIRED' | 'CRITICAL';
export type NotificationInboxFilter = 'ALL' | 'UNREAD' | 'CRITICAL';

export interface NotificationPreference {
  key: NotificationPreferenceKey;
  enabled: boolean;
  frequency: NotificationFrequency;
  critical: boolean;
}

export interface NotificationItem {
  id: string;
  appointmentId: string;
  event: NotificationEvent;
  preferenceKey: NotificationPreferenceKey;
  severity: NotificationSeverity;
  title: string;
  message: string;
  appointmentReference: string;
  purchaseOrderNumber: string;
  warehouseName: string;
  supplierName: string;
  plannedDate: string;
  plannedTime: string;
  safeNextAction: string;
  recipientSummary: string;
  inAppStatus: 'IN_APP_VISIBLE';
  emailStatus: 'EMAIL_SIMULATED_NOT_SENT';
}

export const exceptionalStateIds = [
  'NO_APPOINTMENTS',
  'NO_FILTER_RESULTS',
  'NO_AVAILABLE_SLOTS',
  'NO_ASSIGNED_WAREHOUSES',
  'NO_PERMISSION',
  'UNAVAILABLE_APPOINTMENT',
  'RESERVATION_CONFLICT',
  'EXPIRED_SESSION',
  'SAVE_ERROR',
  'CONNECTION_LOSS',
  'STALE_DATA',
  'FORBIDDEN_ACTION',
  'EXPIRED_HOLD',
  'UPLOAD_ERROR',
  'UNAVAILABLE_CONFIGURATION',
  'BLOCKED_SUPPLIER',
] as const;
export type ExceptionalStateId = (typeof exceptionalStateIds)[number];

export interface ExceptionalStateDefinition {
  id: ExceptionalStateId;
  title: string;
  description: string;
  actionLabel: string;
  actionOutcome: string;
}

const criticalPreferenceKeys = new Set<NotificationPreferenceKey>([
  'CANCELLED',
  'RESCHEDULED',
  'REJECTED',
  'REQUIRED_ACTION',
  'SAFETY',
]);

const eventLabels: Readonly<Record<NotificationEvent, string>> = {
  CREATED: 'Appointment created',
  SUBMITTED: 'Appointment submitted',
  PENDING_APPROVAL: 'Approval required',
  CONFIRMED: 'Appointment confirmed',
  REJECTED: 'Appointment rejected',
  CHANGES_REQUESTED: 'Changes requested',
  SLOT_PROPOSED: 'New slot proposed',
  RESCHEDULED: 'Appointment rescheduled',
  CANCELLED: 'Appointment cancelled',
  REMINDER: 'Upcoming appointment reminder',
  MISSING_DATA: 'Delivery data required',
  LATE_ARRIVAL: 'Late arrival attention',
  NO_SHOW: 'No-show confirmed',
  SHARED_COMMENT: 'Shared comment added',
};

const exceptionalStates: readonly ExceptionalStateDefinition[] = [
  { id: 'NO_APPOINTMENTS', title: 'No appointments', description: 'No appointments are available in the current actor scope.', actionLabel: 'Review current scope', actionOutcome: 'Scope guidance opened locally. No access or appointment data changed.' },
  { id: 'NO_FILTER_RESULTS', title: 'No filter results', description: 'The active filters do not match any visible appointment.', actionLabel: 'Review filter guidance', actionOutcome: 'Filter guidance opened locally. Filters were not silently changed.' },
  { id: 'NO_AVAILABLE_SLOTS', title: 'No available slots', description: 'No compatible capacity is available for the selected period.', actionLabel: 'Review alternative-date guidance', actionOutcome: 'Alternative-date guidance opened locally. No slot was reserved.' },
  { id: 'NO_ASSIGNED_WAREHOUSES', title: 'No assigned warehouses', description: 'The active user has no warehouse assignment for this action.', actionLabel: 'Review assignment guidance', actionOutcome: 'Assignment guidance opened locally. No warehouse permission was granted.' },
  { id: 'NO_PERMISSION', title: 'No permission', description: 'The active role is not authorized for this operation.', actionLabel: 'Review permission guidance', actionOutcome: 'Permission guidance opened locally. No authorization changed.' },
  { id: 'UNAVAILABLE_APPOINTMENT', title: 'Unavailable appointment', description: 'The requested appointment is missing or outside the active scope.', actionLabel: 'Return to scoped records', actionOutcome: 'Scoped-record guidance opened locally. No hidden record was revealed.' },
  { id: 'RESERVATION_CONFLICT', title: 'Reservation conflict', description: 'The selected slot was reserved by another action before completion.', actionLabel: 'Review nearest-slot guidance', actionOutcome: 'Nearest-slot guidance opened locally. No replacement slot was booked.' },
  { id: 'EXPIRED_SESSION', title: 'Expired session', description: 'The demonstration session is no longer valid for the attempted action.', actionLabel: 'Review sign-in guidance', actionOutcome: 'Sign-in guidance opened locally. No session was renewed.' },
  { id: 'SAVE_ERROR', title: 'Save error', description: 'The requested change could not be saved.', actionLabel: 'Review retry guidance', actionOutcome: 'Retry guidance opened locally. No save success was fabricated.' },
  { id: 'CONNECTION_LOSS', title: 'Connection loss', description: 'The connection is unavailable and current data may not be refreshed.', actionLabel: 'Review offline guidance', actionOutcome: 'Offline guidance opened locally. No reconnection was claimed.' },
  { id: 'STALE_DATA', title: 'Stale data', description: 'A newer version may exist and the current action must stop.', actionLabel: 'Review refresh guidance', actionOutcome: 'Refresh guidance opened locally. No data version was replaced.' },
  { id: 'FORBIDDEN_ACTION', title: 'Forbidden action', description: 'The requested transition is not allowed from the current state.', actionLabel: 'Review allowed actions', actionOutcome: 'Allowed-action guidance opened locally. No transition occurred.' },
  { id: 'EXPIRED_HOLD', title: 'Expired hold', description: 'The temporary capacity hold expired before confirmation.', actionLabel: 'Review availability guidance', actionOutcome: 'Availability guidance opened locally. No capacity hold was restored.' },
  { id: 'UPLOAD_ERROR', title: 'Upload error', description: 'The local upload demonstration could not accept the selected file.', actionLabel: 'Review file guidance', actionOutcome: 'File guidance opened locally. No document was uploaded or stored.' },
  { id: 'UNAVAILABLE_CONFIGURATION', title: 'Unavailable configuration', description: 'Required warehouse or Supplier configuration is not available.', actionLabel: 'Review configuration guidance', actionOutcome: 'Configuration guidance opened locally. No configuration was created.' },
  { id: 'BLOCKED_SUPPLIER', title: 'Blocked Supplier', description: 'The Supplier may review history but cannot create or reschedule without an Administrator decision.', actionLabel: 'Review escalation guidance', actionOutcome: 'Escalation guidance opened locally. The Supplier remains blocked.' },
];

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('en-US');
}

function recipientSummary(role: UiMvpRole, event: NotificationEvent): string {
  if (role === 'Supplier Administrator' || role === 'Supplier User') {
    return 'Active Supplier user · Supplier Administrator · Supplier primary contact';
  }
  if (role === 'Security Officer') {
    return event === 'NO_SHOW' || event === 'LATE_ARRIVAL'
      ? 'Active Security Officer · assigned Warehouse Administrator'
      : 'Active Security Officer';
  }
  return 'Active internal user · assigned Warehouse Operator/Administrator';
}

function item(
  record: AppointmentWorkspaceRecord,
  actor: Pick<DemoActor, 'role'>,
  event: NotificationEvent,
  preferenceKey: NotificationPreferenceKey,
  severity: NotificationSeverity,
  safeNextAction: string,
  suffix: string,
): NotificationItem {
  return {
    id: `${record.id}:${event}:${suffix}`,
    appointmentId: record.id,
    event,
    preferenceKey,
    severity,
    title: eventLabels[event],
    message: `${record.systemReference} · PO ${record.purchaseOrderNumber} · ${record.warehouseName} · ${record.plannedDate} ${record.plannedTime}`,
    appointmentReference: record.systemReference,
    purchaseOrderNumber: record.purchaseOrderNumber,
    warehouseName: record.warehouseName,
    supplierName: record.supplierName,
    plannedDate: record.plannedDate,
    plannedTime: record.plannedTime,
    safeNextAction,
    recipientSummary: recipientSummary(actor.role, event),
    inAppStatus: 'IN_APP_VISIBLE',
    emailStatus: 'EMAIL_SIMULATED_NOT_SENT',
  };
}

export function createDefaultNotificationPreferences(): readonly NotificationPreference[] {
  return notificationPreferenceKeys.map((key) => ({
    key,
    enabled: true,
    frequency: 'IMMEDIATE',
    critical: criticalPreferenceKeys.has(key),
  }));
}

export function updateNotificationPreference(
  preferences: readonly NotificationPreference[],
  key: NotificationPreferenceKey,
  patch: Partial<Pick<NotificationPreference, 'enabled' | 'frequency'>>,
): { preferences: readonly NotificationPreference[]; error: string | null } {
  const current = preferences.find((preference) => preference.key === key);
  if (!current) return { preferences, error: 'Notification preference is unavailable.' };
  if (current.critical && patch.enabled === false) {
    return { preferences, error: 'Critical notifications cannot be disabled.' };
  }
  if (patch.frequency && !notificationFrequencies.includes(patch.frequency)) {
    return { preferences, error: 'Notification frequency is invalid.' };
  }
  return {
    preferences: preferences.map((preference) => preference.key === key
      ? { ...preference, ...patch, enabled: preference.critical ? true : patch.enabled ?? preference.enabled }
      : preference),
    error: null,
  };
}

export function deriveNotificationItems(
  records: readonly AppointmentWorkspaceRecord[],
  actor: Pick<DemoActor, 'role'>,
): readonly NotificationItem[] {
  const items: NotificationItem[] = [];
  for (const record of records) {
    items.push(item(record, actor, 'CREATED', 'CREATED', 'INFORMATION', 'Open the scoped appointment details.', 'created'));

    const lifecycleEvent: Partial<Record<AppointmentWorkspaceRecord['lifecycleStatus'], NotificationEvent>> = {
      SUBMITTED: 'SUBMITTED',
      PENDING_APPROVAL: 'PENDING_APPROVAL',
      CONFIRMED: 'CONFIRMED',
      REJECTED: 'REJECTED',
      CANCELLED: 'CANCELLED',
    };
    const event = lifecycleEvent[record.lifecycleStatus];
    if (event) {
      const critical = event === 'REJECTED' || event === 'CANCELLED' || event === 'PENDING_APPROVAL';
      items.push(item(
        record,
        actor,
        event,
        event === 'PENDING_APPROVAL' ? 'REQUIRED_ACTION' : event,
        critical ? 'CRITICAL' : 'INFORMATION',
        critical ? 'Review the scoped appointment and required next action.' : 'Open the scoped appointment details.',
        'lifecycle',
      ));
    }

    if (record.planningState === 'AWAITING_DETAILS') {
      items.push(item(record, actor, 'MISSING_DATA', 'REQUIRED_ACTION', 'CRITICAL', 'Open the scoped appointment and review missing delivery data.', 'planning'));
    } else if (record.planningState === 'VALIDATION_CONFLICT') {
      items.push(item(record, actor, 'CHANGES_REQUESTED', 'REQUIRED_ACTION', 'CRITICAL', 'Open the scoped appointment and review the visible conflict state.', 'planning'));
    }

    if (record.changeStatus === 'RESCHEDULE_REQUESTED') {
      items.push(item(record, actor, 'RESCHEDULED', 'RESCHEDULED', 'CRITICAL', 'Review the scoped reschedule request before any action.', 'change'));
    } else if (record.changeStatus === 'SLOT_PROPOSED') {
      items.push(item(record, actor, 'SLOT_PROPOSED', 'SLOT_PROPOSED', 'ACTION_REQUIRED', 'Review the proposed slot in the scoped appointment.', 'change'));
    } else if (record.changeStatus === 'SUPPLIER_ACTION_REQUIRED') {
      items.push(item(record, actor, 'CHANGES_REQUESTED', 'REQUIRED_ACTION', 'CRITICAL', 'Review the required Supplier action in the scoped appointment.', 'change'));
    }

    if (record.operationalStatus === 'NO_SHOW') {
      items.push(item(record, actor, 'NO_SHOW', 'SAFETY', 'CRITICAL', 'Review the scoped no-show evidence and authorized workflow.', 'operational'));
    } else if (record.operationalStatus === 'WAITING_FOR_DOCK') {
      items.push(item(record, actor, 'LATE_ARRIVAL', 'SAFETY', 'CRITICAL', 'Review the scoped operational timing and safety guidance.', 'operational'));
    } else if (record.operationalStatus === 'EXPECTED') {
      items.push(item(record, actor, 'REMINDER', 'REMINDER', 'INFORMATION', 'Review the upcoming scoped appointment.', 'operational'));
    }

    for (const comment of record.comments.filter((candidate) => candidate.visibility === 'SHARED_COMMENT')) {
      items.push(item(record, actor, 'SHARED_COMMENT', 'SHARED_COMMENT', 'INFORMATION', 'Open the scoped appointment to read the shared comment.', `comment-${comment.id}`));
    }
  }
  return items.sort((left, right) => {
    const date = `${left.plannedDate}T${left.plannedTime}`.localeCompare(`${right.plannedDate}T${right.plannedTime}`, 'en-US');
    if (date !== 0) return date;
    return left.id.localeCompare(right.id, 'en-US');
  });
}

export function filterNotificationItems(
  items: readonly NotificationItem[],
  readIds: ReadonlySet<string>,
  filter: NotificationInboxFilter,
  search: string,
): readonly NotificationItem[] {
  const query = normalize(search);
  return items.filter((candidate) => {
    const matchesFilter = filter === 'ALL'
      || (filter === 'UNREAD' && !readIds.has(candidate.id))
      || (filter === 'CRITICAL' && candidate.severity === 'CRITICAL');
    if (!matchesFilter) return false;
    if (!query) return true;
    return [
      candidate.title,
      candidate.appointmentReference,
      candidate.purchaseOrderNumber,
      candidate.warehouseName,
      candidate.supplierName,
      candidate.event,
    ].some((value) => normalize(value).includes(query));
  });
}

export function getExceptionalStates(): readonly ExceptionalStateDefinition[] {
  return exceptionalStates;
}

export function isCriticalPreference(key: NotificationPreferenceKey): boolean {
  return criticalPreferenceKeys.has(key);
}
