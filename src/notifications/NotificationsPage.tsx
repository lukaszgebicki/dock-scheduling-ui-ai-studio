import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Bell, Mail, ShieldAlert } from 'lucide-react';
import { useAppointmentWorkspace } from '../appointments/AppointmentWorkspaceProvider';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import { ExceptionalStatePanel } from './ExceptionalStatePanel';
import {
  createDefaultNotificationPreferences,
  deriveNotificationItems,
  filterNotificationItems,
  getExceptionalStates,
  notificationFrequencies,
  updateNotificationPreference,
  type ExceptionalStateDefinition,
  type NotificationFrequency,
  type NotificationInboxFilter,
  type NotificationPreferenceKey,
} from './notificationDomain';

const preferenceLabels: Readonly<Record<NotificationPreferenceKey, string>> = {
  CREATED: 'Creation',
  SUBMITTED: 'Submitted',
  PENDING_APPROVAL: 'Pending approval',
  CONFIRMED: 'Confirmed',
  REJECTED: 'Rejected',
  CHANGES_REQUESTED: 'Changes requested',
  SLOT_PROPOSED: 'Slot proposed',
  RESCHEDULED: 'Rescheduled',
  CANCELLED: 'Cancelled',
  REMINDER: 'Reminder',
  MISSING_DATA: 'Missing data',
  LATE_ARRIVAL: 'Late arrival',
  NO_SHOW: 'No-show',
  SHARED_COMMENT: 'Shared comment',
  REQUIRED_ACTION: 'Required action',
  SAFETY: 'Safety communication',
};

function severityClasses(severity: string): string {
  if (severity === 'CRITICAL') return 'border-red-300 bg-red-50 text-red-900';
  if (severity === 'ACTION_REQUIRED') return 'border-amber-300 bg-amber-50 text-amber-900';
  return 'border-blue-200 bg-blue-50 text-blue-900';
}

export function NotificationsPage() {
  const { activeActor } = useDemoDomain();
  const { visibleRecords } = useAppointmentWorkspace();
  const [preferences, setPreferences] = useState(createDefaultNotificationPreferences);
  const [readIds, setReadIds] = useState<ReadonlySet<string>>(() => new Set());
  const [filter, setFilter] = useState<NotificationInboxFilter>('ALL');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setPreferences(createDefaultNotificationPreferences());
    setReadIds(new Set());
    setFilter('ALL');
    setSearch('');
    setMessage(null);
  }, [activeActor.id]);

  const allItems = useMemo(
    () => deriveNotificationItems(visibleRecords, activeActor),
    [activeActor, visibleRecords],
  );
  const visibleItems = useMemo(
    () => filterNotificationItems(allItems, readIds, filter, search),
    [allItems, filter, readIds, search],
  );
  const exceptionalStates = useMemo(() => getExceptionalStates(), []);

  const updateEnabled = (key: NotificationPreferenceKey, enabled: boolean) => {
    const result = updateNotificationPreference(preferences, key, { enabled });
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setPreferences(result.preferences);
    setMessage('Notification preference changed in local memory only. No delivery setting was persisted.');
  };

  const updateFrequency = (key: NotificationPreferenceKey, frequency: NotificationFrequency) => {
    const result = updateNotificationPreference(preferences, key, { frequency });
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setPreferences(result.preferences);
    setMessage('Notification frequency changed in local memory only. No schedule or delivery was created.');
  };

  const toggleRead = (id: string) => {
    setReadIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setMessage('Read state changed locally. No appointment or notification was persisted.');
  };

  const handleSafeAction = (state: ExceptionalStateDefinition) => {
    setMessage(state.actionOutcome);
  };

  return (
    <div className="mx-auto max-w-7xl" aria-labelledby="notifications-title">
      <header className="mb-6">
        <Link to="/appointments" className="text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">← Back to appointments</Link>
        <p className="mt-4 text-sm font-medium text-[#023466]">Local demonstrational communication</p>
        <h1 id="notifications-title" className="mt-1 text-2xl font-semibold text-gray-900">Notifications and exceptional states</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          In-app items are derived only from appointments visible to the active actor. E-mail is represented by a non-delivery status; no message is sent, scheduled or persisted.
        </p>
      </header>

      {message && (
        <p role="status" className="mb-5 rounded-md border border-gray-300 bg-white p-3 text-sm text-gray-800">{message}</p>
      )}

      <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200" aria-labelledby="inbox-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="inbox-title" className="flex items-center gap-2 font-semibold text-gray-900"><Bell className="h-5 w-5" aria-hidden="true" />Actor-scoped inbox</h2>
            <p className="mt-1 text-sm text-gray-600">Active actor: {activeActor.role} · {activeActor.userId}</p>
          </div>
          <p className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700">{visibleItems.length} shown of {allItems.length} local items</p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">
            Inbox filter
            <select aria-label="Notification inbox filter" value={filter} onChange={(event) => setFilter(event.target.value as NotificationInboxFilter)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">
              <option value="ALL">All notifications</option>
              <option value="UNREAD">Unread only</option>
              <option value="CRITICAL">Critical only</option>
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Search visible notification fields
            <input aria-label="Notification search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Appointment, PO, Supplier, warehouse or event" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
          </label>
        </div>

        {visibleRecords.length === 0 ? (
          <div className="mt-5 rounded-md border border-gray-300 bg-gray-50 p-4">
            <h3 className="font-semibold text-gray-900">No appointments in the active scope</h3>
            <p className="mt-1 text-sm text-gray-600">No notification item can be derived. Review the current actor and warehouse assignments.</p>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="mt-5 rounded-md border border-gray-300 bg-gray-50 p-4">
            <h3 className="font-semibold text-gray-900">No matching notifications</h3>
            <p className="mt-1 text-sm text-gray-600">Adjust the local filter or search. No hidden notification data is available.</p>
          </div>
        ) : (
          <ul className="mt-5 space-y-3" aria-label="Actor-scoped notifications">
            {visibleItems.map((notification) => {
              const isRead = readIds.has(notification.id);
              return (
                <li key={notification.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                        <span className={`rounded border px-2 py-1 text-xs font-semibold ${severityClasses(notification.severity)}`}>{notification.severity}</span>
                        <span className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700">{isRead ? 'READ' : 'UNREAD'}</span>
                      </div>
                      <p className="mt-2 text-sm text-gray-700">{notification.message}</p>
                      <p className="mt-1 text-sm text-gray-600">Supplier: {notification.supplierName}</p>
                      <p className="mt-1 text-sm text-gray-600">Safe next action: {notification.safeNextAction}</p>
                      <p className="mt-1 text-sm text-gray-600">Recipients: {notification.recipientSummary}</p>
                    </div>
                    <button type="button" onClick={() => toggleRead(notification.id)} className="rounded-md border border-[#023466] px-3 py-2 text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
                      Mark as {isRead ? 'unread' : 'read'}
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3 text-xs font-semibold text-gray-700">
                    <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1"><Bell className="h-3.5 w-3.5" aria-hidden="true" />{notification.inAppStatus}</span>
                    <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1"><Mail className="h-3.5 w-3.5" aria-hidden="true" />{notification.emailStatus}</span>
                    <span className="rounded bg-gray-100 px-2 py-1">{notification.event}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200" aria-labelledby="preferences-title">
        <h2 id="preferences-title" className="font-semibold text-gray-900">Demonstrational notification preferences</h2>
        <p className="mt-1 text-sm text-gray-600">Critical cancellation, reschedule, rejection, required-action and safety communication remain enabled and immediate.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {preferences.map((preference) => (
            <article key={preference.key} className="rounded-md border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{preferenceLabels[preference.key]}</h3>
                  <p className="mt-1 text-xs font-semibold text-gray-600">{preference.critical ? 'CRITICAL — LOCKED ON' : 'NONCRITICAL'}</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    aria-label={`Enable ${preferenceLabels[preference.key]}`}
                    checked={preference.enabled}
                    disabled={preference.critical}
                    onChange={(event) => updateEnabled(preference.key, event.target.checked)}
                  />
                  Enabled
                </label>
              </div>
              <label className="mt-3 block text-sm font-medium text-gray-700">
                Frequency
                <select
                  aria-label={`Frequency ${preferenceLabels[preference.key]}`}
                  value={preference.frequency}
                  disabled={preference.critical || !preference.enabled}
                  onChange={(event) => updateFrequency(preference.key, event.target.value as NotificationFrequency)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100"
                >
                  {notificationFrequencies.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
                </select>
              </label>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6" aria-labelledby="exceptional-states-title">
        <div className="mb-4">
          <h2 id="exceptional-states-title" className="flex items-center gap-2 text-xl font-semibold text-gray-900"><ShieldAlert className="h-5 w-5" aria-hidden="true" />Exceptional-state catalog</h2>
          <p className="mt-1 text-sm text-gray-600">Each action opens local guidance only. It never claims a successful save, booking, upload, reconnect, reauthentication or permission change.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {exceptionalStates.map((state) => <ExceptionalStatePanel key={state.id} state={state} onSafeAction={handleSafeAction} />)}
        </div>
      </section>
    </div>
  );
}
