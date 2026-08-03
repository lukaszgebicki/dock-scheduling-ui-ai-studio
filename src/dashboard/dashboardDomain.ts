import type { AppointmentWorkspaceRecord } from '../appointments/appointmentWorkspace';
import type { DemoActor, UiMvpRole } from '../demoDomain/demoDomain';

export const dashboardFilterIds = [
  'TODAY',
  'NEXT_HOUR',
  'ACTIVE_WEEK',
  'ON_SITE',
  'AT_DOCK',
  'ATTENTION',
  'REQUIRED_ACTION',
  'NO_SHOW',
  'PENDING_APPROVAL',
  'CANCELLED',
  'UPCOMING',
  'HISTORY',
  'NEXT_APPOINTMENT',
  'ASSIGNED_DOCK',
] as const;
export type DashboardFilterId = (typeof dashboardFilterIds)[number];

export type DashboardAudience =
  | 'INTERNAL_ADMIN'
  | 'WAREHOUSE_OPERATOR'
  | 'SUPPLIER'
  | 'SECURITY';

export interface DashboardMetric {
  id: string;
  label: string;
  value: number | null;
  description: string;
  filter?: DashboardFilterId;
  unavailableReason?: string;
}

export interface DashboardModel {
  audience: DashboardAudience;
  anchorDate: string | null;
  metrics: readonly DashboardMetric[];
  agenda: readonly AppointmentWorkspaceRecord[];
  nextAppointment: AppointmentWorkspaceRecord | null;
  responsiveHeading: string;
  responsiveDescription: string;
  desktopRecommendation: string | null;
}

const onSiteStatuses = new Set<AppointmentWorkspaceRecord['operationalStatus']>([
  'CHECKED_IN',
  'WAITING_FOR_DOCK',
  'AT_DOCK',
  'UNLOADING',
]);

const historyOperationalStatuses = new Set<AppointmentWorkspaceRecord['operationalStatus']>([
  'COMPLETED',
  'CHECKED_OUT',
]);

function compareRecords(
  left: AppointmentWorkspaceRecord,
  right: AppointmentWorkspaceRecord,
): number {
  return left.plannedDate.localeCompare(right.plannedDate, 'en-US')
    || left.plannedTime.localeCompare(right.plannedTime, 'en-US')
    || left.id.localeCompare(right.id, 'en-US');
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const normalized = `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
  return normalized === value ? parsed : null;
}

function formatIsoDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function weekRange(anchorDate: string): { from: string; to: string } | null {
  const parsed = parseIsoDate(anchorDate);
  if (!parsed) return null;
  const day = parsed.getUTCDay();
  const fromMonday = day === 0 ? 6 : day - 1;
  const start = new Date(parsed);
  start.setUTCDate(start.getUTCDate() - fromMonday);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return { from: formatIsoDate(start), to: formatIsoDate(end) };
}

function timeToMinutes(value: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function hasRequiredAction(record: AppointmentWorkspaceRecord): boolean {
  return record.requiredAction !== 'No action required'
    && record.requiredAction !== 'Cancelled';
}

function isAttentionRecord(record: AppointmentWorkspaceRecord): boolean {
  return record.planningState === 'VALIDATION_CONFLICT'
    || record.changeStatus !== 'NO_CHANGE_REQUEST'
    || record.operationalStatus === 'WAITING_FOR_DOCK'
    || hasRequiredAction(record);
}

function isUpcoming(record: AppointmentWorkspaceRecord, anchorDate: string): boolean {
  return record.plannedDate >= anchorDate
    && record.lifecycleStatus !== 'CANCELLED'
    && !historyOperationalStatuses.has(record.operationalStatus);
}

function isHistory(record: AppointmentWorkspaceRecord): boolean {
  return record.lifecycleStatus === 'CANCELLED'
    || historyOperationalStatuses.has(record.operationalStatus);
}

export function dashboardAnchorDate(
  records: readonly AppointmentWorkspaceRecord[],
): string | null {
  return records.length === 0
    ? null
    : records.slice().sort(compareRecords)[0].plannedDate;
}

export function isDashboardFilterId(value: string | null): value is DashboardFilterId {
  return value !== null && dashboardFilterIds.includes(value as DashboardFilterId);
}

export function dashboardAudience(role: UiMvpRole): DashboardAudience {
  if (role === 'Supplier Administrator' || role === 'Supplier User') return 'SUPPLIER';
  if (role === 'Security Officer') return 'SECURITY';
  if (role === 'Warehouse Operator') return 'WAREHOUSE_OPERATOR';
  return 'INTERNAL_ADMIN';
}

export function filterDashboardRecords(
  records: readonly AppointmentWorkspaceRecord[],
  filter: DashboardFilterId,
  anchorDate: string,
): readonly AppointmentWorkspaceRecord[] {
  const sorted = records.slice().sort(compareRecords);
  const anchorRecords = sorted.filter((record) => record.plannedDate === anchorDate);
  const anchorMinutes = anchorRecords
    .map((record) => timeToMinutes(record.plannedTime))
    .filter((value): value is number => value !== null)
    .sort((left, right) => left - right)[0] ?? null;
  const range = weekRange(anchorDate);

  const matches = (record: AppointmentWorkspaceRecord): boolean => {
    switch (filter) {
      case 'TODAY':
        return record.plannedDate === anchorDate;
      case 'NEXT_HOUR': {
        if (record.plannedDate !== anchorDate || anchorMinutes === null) return false;
        const minutes = timeToMinutes(record.plannedTime);
        return minutes !== null && minutes >= anchorMinutes && minutes < anchorMinutes + 60;
      }
      case 'ACTIVE_WEEK':
        return Boolean(range && record.plannedDate >= range.from && record.plannedDate <= range.to);
      case 'ON_SITE':
        return onSiteStatuses.has(record.operationalStatus);
      case 'AT_DOCK':
        return record.operationalStatus === 'AT_DOCK' || record.operationalStatus === 'UNLOADING';
      case 'ATTENTION':
        return isAttentionRecord(record);
      case 'REQUIRED_ACTION':
        return hasRequiredAction(record);
      case 'NO_SHOW':
        return record.operationalStatus === 'NO_SHOW';
      case 'PENDING_APPROVAL':
        return record.lifecycleStatus === 'PENDING_APPROVAL';
      case 'CANCELLED':
        return record.lifecycleStatus === 'CANCELLED';
      case 'UPCOMING':
        return isUpcoming(record, anchorDate);
      case 'HISTORY':
        return isHistory(record);
      case 'NEXT_APPOINTMENT': {
        const next = sorted.find((candidate) => isUpcoming(candidate, anchorDate));
        return next?.id === record.id;
      }
      case 'ASSIGNED_DOCK':
        return record.assignedDockId !== null;
    }
  };

  return sorted.filter(matches);
}

function countMetric(
  id: string,
  label: string,
  description: string,
  filter: DashboardFilterId,
  records: readonly AppointmentWorkspaceRecord[],
  anchorDate: string,
): DashboardMetric {
  return {
    id,
    label,
    description,
    filter,
    value: filterDashboardRecords(records, filter, anchorDate).length,
  };
}

function unavailableMetric(
  id: string,
  label: string,
  description: string,
  unavailableReason: string,
): DashboardMetric {
  return { id, label, description, value: null, unavailableReason };
}

function operatorMetrics(
  records: readonly AppointmentWorkspaceRecord[],
  anchorDate: string,
): readonly DashboardMetric[] {
  return [
    countMetric('today', "Today's appointments", 'Appointments planned for the deterministic dashboard day.', 'TODAY', records, anchorDate),
    countMetric('next-hour', 'Expected in the next hour', 'Appointments in the first visible one-hour window of the dashboard day.', 'NEXT_HOUR', records, anchorDate),
    countMetric('active-week', 'Appointments this week', 'Appointments in the inclusive Monday-through-Sunday dashboard week.', 'ACTIVE_WEEK', records, anchorDate),
    countMetric('on-site', 'Vehicles on site', 'Appointments with an on-site operational status.', 'ON_SITE', records, anchorDate),
    countMetric('at-dock', 'At dock or unloading', 'Appointments currently at a dock or unloading.', 'AT_DOCK', records, anchorDate),
    countMetric('attention', 'Late or attention required', 'Visible planning, change, waiting-for-dock or required-action signals.', 'ATTENTION', records, anchorDate),
    countMetric('required-action', 'Required action', 'Appointments with an explicit safe required action.', 'REQUIRED_ACTION', records, anchorDate),
    countMetric('no-show', 'Potential or confirmed No Show', 'Appointments carrying the visible No Show operational status.', 'NO_SHOW', records, anchorDate),
  ];
}

function adminMetrics(
  records: readonly AppointmentWorkspaceRecord[],
  anchorDate: string,
): readonly DashboardMetric[] {
  return [
    ...operatorMetrics(records, anchorDate),
    countMetric('pending-approval', 'Pending approval', 'Appointments in the pending-approval lifecycle status.', 'PENDING_APPROVAL', records, anchorDate),
    countMetric('cancellations', 'Cancellations', 'Visible cancelled appointments.', 'CANCELLED', records, anchorDate),
    countMetric('assigned-dock', 'Appointments with an assigned dock', 'Appointments with an explicit dock assignment.', 'ASSIGNED_DOCK', records, anchorDate),
    unavailableMetric('slot-utilization', 'Slot utilization', 'Utilization requires a compatible slot-capacity denominator.', 'Unavailable: the visible appointment records do not contain a slot-capacity denominator.'),
    unavailableMetric('dock-utilization', 'Dock utilization', 'Utilization requires dock availability and time-window denominators.', 'Unavailable: the visible appointment records do not contain dock availability denominators.'),
    unavailableMetric('manual-overrides', 'Manual overrides', 'Override totals require explicit auditable override events.', 'Unavailable: no explicit manual-override evidence exists in the visible records.'),
    unavailableMetric('average-service-time', 'Average service time', 'Service time requires paired operational timestamps.', 'Unavailable: no paired unloading/completion timestamps exist in the visible records.'),
    unavailableMetric('average-waiting-time', 'Average waiting time', 'Waiting time requires paired check-in/dock timestamps.', 'Unavailable: no paired check-in/dock timestamps exist in the visible records.'),
  ];
}

function supplierMetrics(
  records: readonly AppointmentWorkspaceRecord[],
  anchorDate: string,
): readonly DashboardMetric[] {
  return [
    countMetric('next-appointment', 'Next appointment', 'The earliest upcoming appointment in the active Supplier scope.', 'NEXT_APPOINTMENT', records, anchorDate),
    countMetric('required-action', 'Required actions', 'Supplier-visible appointments with an explicit next action.', 'REQUIRED_ACTION', records, anchorDate),
    countMetric('pending-approval', 'Pending approval', 'Supplier-visible appointments awaiting approval.', 'PENDING_APPROVAL', records, anchorDate),
    countMetric('upcoming', 'Upcoming visits', 'Supplier-visible active appointments on or after the dashboard date.', 'UPCOMING', records, anchorDate),
    countMetric('history', 'History', 'Supplier-visible cancelled or completed appointments.', 'HISTORY', records, anchorDate),
  ];
}

function securityMetrics(
  records: readonly AppointmentWorkspaceRecord[],
  anchorDate: string,
): readonly DashboardMetric[] {
  return [
    countMetric('today', "Today's gate plan", 'Scoped appointments planned for the dashboard day.', 'TODAY', records, anchorDate),
    countMetric('next-hour', 'Expected in the next hour', 'Scoped arrivals in the first visible one-hour window.', 'NEXT_HOUR', records, anchorDate),
    countMetric('on-site', 'Vehicles on site', 'Scoped appointments with an on-site status.', 'ON_SITE', records, anchorDate),
    countMetric('attention', 'Gate attention', 'Scoped records with a safe visible attention signal.', 'ATTENTION', records, anchorDate),
    countMetric('no-show', 'No Show', 'Scoped appointments with the No Show operational status.', 'NO_SHOW', records, anchorDate),
  ];
}

export function deriveDashboardModel(
  records: readonly AppointmentWorkspaceRecord[],
  actor: Pick<DemoActor, 'role'>,
): DashboardModel {
  const agenda = records.slice().sort(compareRecords);
  const anchorDate = dashboardAnchorDate(agenda);
  const audience = dashboardAudience(actor.role);
  const nextAppointment = anchorDate
    ? filterDashboardRecords(agenda, 'NEXT_APPOINTMENT', anchorDate)[0] ?? null
    : null;

  if (!anchorDate) {
    return {
      audience,
      anchorDate: null,
      metrics: [],
      agenda: [],
      nextAppointment: null,
      responsiveHeading: 'No scoped dashboard data',
      responsiveDescription: 'No actor-visible appointments are available.',
      desktopRecommendation: audience === 'INTERNAL_ADMIN'
        ? 'Complex calendar and capacity configuration is recommended on desktop.'
        : null,
    };
  }

  if (audience === 'SUPPLIER') {
    return {
      audience,
      anchorDate,
      metrics: supplierMetrics(agenda, anchorDate),
      agenda,
      nextAppointment,
      responsiveHeading: 'Supplier mobile day and time list',
      responsiveDescription: 'Upcoming visits are presented as readable day-and-time cards rather than a compressed desktop calendar.',
      desktopRecommendation: null,
    };
  }
  if (audience === 'SECURITY') {
    return {
      audience,
      anchorDate,
      metrics: securityMetrics(agenda, anchorDate),
      agenda,
      nextAppointment,
      responsiveHeading: 'Gate-responsive cards',
      responsiveDescription: 'Operationally safe arrival cards remain usable on phone and tablet.',
      desktopRecommendation: null,
    };
  }
  if (audience === 'WAREHOUSE_OPERATOR') {
    return {
      audience,
      anchorDate,
      metrics: operatorMetrics(agenda, anchorDate),
      agenda,
      nextAppointment,
      responsiveHeading: 'Responsive day agenda',
      responsiveDescription: 'The operator view uses an agenda; full dock grids remain a desktop/tablet presentation.',
      desktopRecommendation: null,
    };
  }
  return {
    audience,
    anchorDate,
    metrics: adminMetrics(agenda, anchorDate),
    agenda,
    nextAppointment,
    responsiveHeading: 'Administration overview',
    responsiveDescription: 'Role-scoped operational KPIs and explicitly unavailable evidence-based metrics.',
    desktopRecommendation: 'Complex calendar, dock and capacity configuration is recommended on desktop.',
  };
}

export function dashboardFilterLabel(filter: DashboardFilterId): string {
  const labels: Readonly<Record<DashboardFilterId, string>> = {
    TODAY: "Today's appointments",
    NEXT_HOUR: 'Expected in the next hour',
    ACTIVE_WEEK: 'Appointments this week',
    ON_SITE: 'Vehicles on site',
    AT_DOCK: 'At dock or unloading',
    ATTENTION: 'Attention required',
    REQUIRED_ACTION: 'Required action',
    NO_SHOW: 'No Show',
    PENDING_APPROVAL: 'Pending approval',
    CANCELLED: 'Cancelled',
    UPCOMING: 'Upcoming visits',
    HISTORY: 'History',
    NEXT_APPOINTMENT: 'Next appointment',
    ASSIGNED_DOCK: 'Assigned dock',
  };
  return labels[filter];
}
