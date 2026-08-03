import { describe, expect, it } from 'vitest';
import { createInitialAppointmentWorkspaceState } from '../appointments/appointmentWorkspace';
import { getDemoActor } from '../demoDomain/demoDomain';
import {
  createDefaultNotificationPreferences,
  deriveNotificationItems,
  exceptionalStateIds,
  filterNotificationItems,
  getExceptionalStates,
  isCriticalPreference,
  notificationEvents,
  notificationFrequencies,
  updateNotificationPreference,
} from './notificationDomain';

const records = createInitialAppointmentWorkspaceState().records;

describe('notification domain', () => {
  it('supports every approved notification event and delivery frequency', () => {
    expect(notificationEvents).toEqual([
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
    ]);
    expect(notificationFrequencies).toEqual([
      'IMMEDIATE',
      'HOURLY_DIGEST',
      'DAILY_DIGEST',
    ]);
  });

  it('keeps critical cancellation, reschedule, rejection, required-action and safety preferences enabled', () => {
    const preferences = createDefaultNotificationPreferences();
    for (const key of ['CANCELLED', 'RESCHEDULED', 'REJECTED', 'REQUIRED_ACTION', 'SAFETY'] as const) {
      expect(isCriticalPreference(key)).toBe(true);
      const current = preferences.find((candidate) => candidate.key === key)!;
      expect(current).toMatchObject({ enabled: true, frequency: 'IMMEDIATE', critical: true });
      const result = updateNotificationPreference(preferences, key, { enabled: false });
      expect(result.error).toBe('Critical notifications cannot be disabled.');
      expect(result.preferences).toBe(preferences);
    }
  });

  it('updates noncritical preferences locally and rejects unavailable or invalid values', () => {
    const preferences = createDefaultNotificationPreferences();
    const disabled = updateNotificationPreference(preferences, 'REMINDER', { enabled: false });
    expect(disabled.error).toBeNull();
    expect(disabled.preferences.find((candidate) => candidate.key === 'REMINDER')?.enabled).toBe(false);

    const digest = updateNotificationPreference(disabled.preferences, 'REMINDER', { frequency: 'DAILY_DIGEST' });
    expect(digest.error).toBeNull();
    expect(digest.preferences.find((candidate) => candidate.key === 'REMINDER')?.frequency).toBe('DAILY_DIGEST');

    const invalid = updateNotificationPreference(preferences, 'REMINDER', { frequency: 'WEEKLY' as never });
    expect(invalid.error).toBe('Notification frequency is invalid.');
    const missing = updateNotificationPreference(preferences, 'UNKNOWN' as never, { enabled: false });
    expect(missing.error).toBe('Notification preference is unavailable.');
  });

  it('derives deterministic safe notifications only from supplied visible records', () => {
    const actor = getDemoActor('supplier-user');
    const visible = records.filter((record) => record.supplierOrganizationId === actor.supplierOrganizationId);
    const items = deriveNotificationItems(visible, actor);
    expect(items.length).toBeGreaterThan(visible.length);
    expect(new Set(items.map((candidate) => candidate.appointmentId)))
      .toEqual(new Set(visible.map((record) => record.id)));
    expect(items.every((candidate) => candidate.supplierName === 'Vistula Materials')).toBe(true);
    expect(items.every((candidate) => candidate.inAppStatus === 'IN_APP_VISIBLE')).toBe(true);
    expect(items.every((candidate) => candidate.emailStatus === 'EMAIL_SIMULATED_NOT_SENT')).toBe(true);
    expect(deriveNotificationItems(visible, actor)).toEqual(items);
  });

  it('never serializes internal notes, diagnostics, lineage, audit or comment text', () => {
    const items = deriveNotificationItems(records, getDemoActor('system-administrator'));
    const serialized = JSON.stringify(items);
    expect(serialized).not.toContain('EXACT_MATCH');
    expect(serialized).not.toContain('batch-demo-1');
    expect(serialized).not.toContain('Internal-only note');
    expect(serialized).not.toContain('sourceRowId');
    expect(serialized).not.toContain('changeHistory');
    expect(serialized).not.toContain('statusHistory');
    expect(serialized).not.toContain('Shared delivery clarification');
  });

  it('filters unread and critical items with normalized safe-field search using AND semantics', () => {
    const items = deriveNotificationItems(records, getDemoActor('system-administrator'));
    const readIds = new Set(items.slice(0, 2).map((candidate) => candidate.id));
    const unread = filterNotificationItems(items, readIds, 'UNREAD', '');
    expect(unread).toHaveLength(items.length - 2);
    expect(unread.some((candidate) => readIds.has(candidate.id))).toBe(false);

    const criticalBaltic = filterNotificationItems(items, new Set(), 'CRITICAL', 'baltic freight');
    expect(criticalBaltic.every((candidate) => candidate.severity === 'CRITICAL')).toBe(true);
    expect(criticalBaltic.every((candidate) => candidate.supplierName === 'Baltic Freight')).toBe(true);

    const hidden = filterNotificationItems(items, new Set(), 'ALL', 'EXACT_MATCH');
    expect(hidden).toEqual([]);
  });

  it('provides all sixteen exceptional states with unique safe actions and non-success outcomes', () => {
    const states = getExceptionalStates();
    expect(states.map((state) => state.id)).toEqual(exceptionalStateIds);
    expect(states).toHaveLength(16);
    expect(new Set(states.map((state) => state.actionLabel)).size).toBe(16);
    for (const state of states) {
      expect(state.title.length).toBeGreaterThan(0);
      expect(state.description.length).toBeGreaterThan(0);
      expect(state.actionOutcome).toMatch(/locally|guidance/);
      expect(state.actionOutcome).not.toMatch(/successfully (saved|booked|uploaded|renewed|restored|granted|reconnected|created)|reconnected successfully|permission granted|session renewed|hold restored|document uploaded/i);
    }
  });
});
