import React from 'react';
import type { UiMvpRole } from '../demoDomain/demoDomain';
import './responsiveCompletion.css';

export function ResponsiveActionGroup({
  children,
  label = 'Page actions',
  reverseOnMobile = false,
  stickyOnMobile = false,
}: {
  children: React.ReactNode;
  label?: string;
  reverseOnMobile?: boolean;
  stickyOnMobile?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      data-responsive-action-group="true"
      className={`${stickyOnMobile ? 'sticky bottom-0 z-10 -mx-4 border-t border-gray-200 bg-[#F9FAFB]/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0' : ''} flex ${reverseOnMobile ? 'flex-col-reverse' : 'flex-col'} gap-3 sm:flex-row sm:flex-wrap sm:items-center [&>*]:min-h-11 [&>*]:w-full sm:[&>*]:w-auto`}
    >
      {children}
    </div>
  );
}

export function DesktopRecommendedNotice({
  title = 'Desktop recommended for complex configuration',
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <aside
      aria-label="Desktop recommendation"
      data-responsive-screen="desktop-recommendation"
      className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 md:hidden"
    >
      <p className="font-semibold">{title}</p>
      <div className="mt-1 text-amber-900">{children}</div>
    </aside>
  );
}

export function defaultResponsiveCalendarView(
  role: UiMvpRole,
): 'day' | 'week' {
  return role === 'Supplier Administrator'
    || role === 'Supplier User'
    || role === 'Warehouse Operator'
    ? 'day'
    : 'week';
}
