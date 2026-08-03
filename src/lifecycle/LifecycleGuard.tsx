import React from 'react';
import { Navigate } from 'react-router';
import { planningAppointments, type PlanningAppointment } from '../calendar/planningCalendar';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import type { UiMvpRole } from '../demoDomain/demoDomain';
import { roleMayOpenLifecycle } from './lifecycle';

export function canOpenLifecycleForActor(
  role: UiMvpRole,
  appointments: readonly PlanningAppointment[],
  canViewAppointment: (appointment: PlanningAppointment) => boolean,
): boolean {
  return roleMayOpenLifecycle(role) && appointments.some(canViewAppointment);
}

export function LifecycleGuard({ children }: { children: React.ReactNode }) {
  const { activeActor, canViewAppointment, defaultRoute } = useDemoDomain();
  const allowed = canOpenLifecycleForActor(
    activeActor.role,
    planningAppointments,
    canViewAppointment,
  );
  if (!allowed) return <Navigate to={defaultRoute} replace />;
  return <>{children}</>;
}
