export type AppointmentStatus = 'Scheduled' | 'Confirmed' | 'Checked in' | 'Completed' | 'Cancelled';

export interface DemoAppointment {
  id: string;
  reference: string;
  supplierOrganizationId: 'northstar-packaging' | 'baltic-freight' | 'vistula-materials';
  warehouseId: 'nowy-kisielin-distribution-center' | 'zielona-gora-plant';
  plannedDate: string;
  plannedTime: string;
  deliveryType: 'Palletized goods' | 'Bulk delivery' | 'Packaging' | 'Raw materials';
  status: AppointmentStatus;
}

export const demoAppointments: readonly DemoAppointment[] = [
  {
    id: 'appointment-001',
    reference: 'APT-2026-001',
    supplierOrganizationId: 'northstar-packaging',
    warehouseId: 'nowy-kisielin-distribution-center',
    plannedDate: '2026-07-28',
    plannedTime: '08:00',
    deliveryType: 'Packaging',
    status: 'Confirmed',
  },
  {
    id: 'appointment-002',
    reference: 'APT-2026-002',
    supplierOrganizationId: 'baltic-freight',
    warehouseId: 'zielona-gora-plant',
    plannedDate: '2026-07-28',
    plannedTime: '09:30',
    deliveryType: 'Palletized goods',
    status: 'Scheduled',
  },
  {
    id: 'appointment-003',
    reference: 'APT-2026-003',
    supplierOrganizationId: 'vistula-materials',
    warehouseId: 'nowy-kisielin-distribution-center',
    plannedDate: '2026-07-28',
    plannedTime: '11:00',
    deliveryType: 'Raw materials',
    status: 'Checked in',
  },
  {
    id: 'appointment-004',
    reference: 'APT-2026-004',
    supplierOrganizationId: 'northstar-packaging',
    warehouseId: 'nowy-kisielin-distribution-center',
    plannedDate: '2026-07-29',
    plannedTime: '07:30',
    deliveryType: 'Packaging',
    status: 'Completed',
  },
  {
    id: 'appointment-005',
    reference: 'APT-2026-005',
    supplierOrganizationId: 'vistula-materials',
    warehouseId: 'zielona-gora-plant',
    plannedDate: '2026-07-29',
    plannedTime: '10:15',
    deliveryType: 'Bulk delivery',
    status: 'Confirmed',
  },
  {
    id: 'appointment-006',
    reference: 'APT-2026-006',
    supplierOrganizationId: 'baltic-freight',
    warehouseId: 'zielona-gora-plant',
    plannedDate: '2026-07-30',
    plannedTime: '13:00',
    deliveryType: 'Palletized goods',
    status: 'Cancelled',
  },
  {
    id: 'appointment-007',
    reference: 'APT-2026-007',
    supplierOrganizationId: 'northstar-packaging',
    warehouseId: 'nowy-kisielin-distribution-center',
    plannedDate: '2026-07-30',
    plannedTime: '14:30',
    deliveryType: 'Packaging',
    status: 'Scheduled',
  },
  {
    id: 'appointment-008',
    reference: 'APT-2026-008',
    supplierOrganizationId: 'vistula-materials',
    warehouseId: 'zielona-gora-plant',
    plannedDate: '2026-07-31',
    plannedTime: '08:45',
    deliveryType: 'Raw materials',
    status: 'Confirmed',
  },
];
