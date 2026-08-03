import React from 'react';
import { Navigate, useParams } from 'react-router';
import { useAppointmentWorkspace } from './AppointmentWorkspaceProvider';

export function AppointmentDetailsGuard({ children }: { children: React.ReactNode }) {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { getVisibleRecord } = useAppointmentWorkspace();
  if (!appointmentId || !getVisibleRecord(appointmentId)) {
    return <Navigate to="/appointments" replace />;
  }
  return <>{children}</>;
}
