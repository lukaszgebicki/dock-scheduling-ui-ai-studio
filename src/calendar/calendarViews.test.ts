import { describe, expect, it } from 'vitest';
import { createInitialAppointmentWorkspaceState } from '../appointments/appointmentWorkspace';
import { initialDemoConfiguration } from '../demoDomain/configuration';
import {
  buildWorkspaceCalendarProjection,
  calendarFilterOptions,
  calendarViewIds,
  emptyCalendarFilters,
  groupCalendarProjection,
  toPlanningCalendarAppointment,
  validateCalendarFilters,
  type CalendarFilters,
} from './calendarViews';

const records = createInitialAppointmentWorkspaceState().records;
const warehouses = initialDemoConfiguration.warehouses;

describe('workspace calendar projections', () => {
  it('defines exactly the six approved calendar views', () => {
    expect(calendarViewIds).toEqual([
      'day',
      'week',
      'dock',
      'load-type',
      'list',
      'workflow',
    ]);
  });

  it('creates one stable projection per workspace record without internal evidence', () => {
    const before = JSON.stringify(records);
    const projection = buildWorkspaceCalendarProjection(records, warehouses);

    expect(projection.map((item) => item.record.id)).toEqual([
      'planning-northstar-1001',
      'planning-baltic-2001',
      'planning-vistula-3001',
      'appointment-nonweekly-vistula-001',
    ]);
    expect(new Set(projection.map((item) => item.record.id)).size).toBe(records.length);
    expect(projection.find((item) =>
      item.record.id === 'planning-baltic-2001')?.totals).toEqual({
      lineCount: 3,
      units: 2100,
      pallets: 4.25,
    });
    expect(JSON.stringify(toPlanningCalendarAppointment(records[1])))
      .not.toContain('EXACT_MATCH');
    expect(JSON.stringify(toPlanningCalendarAppointment(records[1])))
      .not.toContain('batch-demo-1');
    expect(JSON.stringify(toPlanningCalendarAppointment(records[1])))
      .not.toContain('Internal import review complete');
    expect(JSON.stringify(records)).toBe(before);
  });

  it('groups Day and Monday-Sunday Week views in deterministic date/time order', () => {
    const nextWeek = {
      ...records[0],
      id: 'calendar-next-week',
      systemReference: 'APT-CALENDAR-NEXT-WEEK',
      externalReference: 'REF-CALENDAR-NEXT-WEEK',
      plannedDate: '2026-08-17',
      plannedTime: '06:00',
    };
    const projection = buildWorkspaceCalendarProjection(
      [...records, nextWeek],
      warehouses,
    );

    const dayGroups = groupCalendarProjection(projection, 'day');
    expect(dayGroups.map((group) => group.label)).toEqual([
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
      '2026-08-14',
      '2026-08-17',
    ]);

    const weekGroups = groupCalendarProjection(projection, 'week');
    expect(weekGroups.map((group) => group.label)).toEqual([
      '2026-08-10 – 2026-08-16',
      '2026-08-17 – 2026-08-23',
    ]);
    expect(weekGroups[0].records.map((item) => item.record.id)).toEqual([
      'planning-northstar-1001',
      'planning-baltic-2001',
      'planning-vistula-3001',
      'appointment-nonweekly-vistula-001',
    ]);
  });

  it('groups Dock, Load Type and Workflow only from existing record evidence', () => {
    const assigned = {
      ...records[1],
      id: 'calendar-assigned-dock',
      systemReference: 'APT-CALENDAR-DOCK',
      externalReference: 'REF-CALENDAR-DOCK',
      plannedTime: '11:00',
      assignedDockId: 'zielona-gora-plant-zg-01',
    };
    const projection = buildWorkspaceCalendarProjection(
      [...records, assigned],
      warehouses,
    );

    expect(groupCalendarProjection(projection, 'dock').map((group) => group.label))
      .toEqual(['Unassigned', 'zielona-gora-plant-zg-01']);
    expect(groupCalendarProjection(projection, 'load-type').map((group) => group.label))
      .toEqual(['Material Delivery', 'Packaging']);
    expect(groupCalendarProjection(projection, 'workflow').some((group) =>
      group.label === 'READY · CONFIRMED · EXPECTED · No action required'))
      .toBe(true);
    expect(groupCalendarProjection(projection, 'workflow').some((group) =>
      group.label.includes('AWAITING_DETAILS · SUBMITTED · EXPECTED')))
      .toBe(true);
  });

  it('applies date, warehouse and delivery filters with AND semantics', () => {
    const filters: CalendarFilters = {
      dateFrom: '2026-08-11',
      dateTo: '2026-08-14',
      warehouseId: 'nowy-kisielin-distribution-center',
      deliveryType: 'Material Delivery',
    };
    const projection = buildWorkspaceCalendarProjection(records, warehouses, filters);

    expect(projection.map((item) => item.record.id)).toEqual([
      'planning-vistula-3001',
    ]);
    expect(calendarFilterOptions(records)).toEqual({
      warehouses: [
        {
          id: 'nowy-kisielin-distribution-center',
          name: 'Nowy Kisielin Distribution Center',
        },
        {
          id: 'zielona-gora-plant',
          name: 'Zielona Góra Plant',
        },
      ],
      deliveryTypes: ['Material Delivery', 'Packaging'],
    });
    expect(validateCalendarFilters({
      ...emptyCalendarFilters,
      dateFrom: '2026-08-15',
      dateTo: '2026-08-14',
    })).toBe('Planned date from must not be after planned date to.');
  });
});
