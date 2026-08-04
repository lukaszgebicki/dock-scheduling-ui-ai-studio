import React from 'react';
import type { UiMvpRole } from '../demoDomain/demoDomain';
import { DesktopRecommendedNotice } from './ResponsivePrimitives';

export function ResponsiveRouteNotice({
  pathname,
  role,
}: {
  pathname: string;
  role: UiMvpRole;
}) {
  const complexWarehouseConfiguration = /^\/warehouses\/[^/]+\/configuration$/.test(pathname)
    && (role === 'System Administrator' || role === 'Warehouse Administrator');

  if (!complexWarehouseConfiguration) return null;

  return (
    <DesktopRecommendedNotice>
      Basic review and actions remain available on this screen. Use a tablet or desktop for dense dock, capacity, recurring-block and calendar configuration to avoid compressed operational controls.
    </DesktopRecommendedNotice>
  );
}
