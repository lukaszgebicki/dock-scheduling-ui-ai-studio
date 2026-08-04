import React from 'react';
import type { UiMvpRole } from '../demoDomain/demoDomain';

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

export function MobileStepProgress({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label: string;
}) {
  const progress = Math.round((current / total) * 100);
  return (
    <section
      aria-label="Mobile booking progress"
      data-responsive-screen="mobile-step-progress"
      className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4 sm:hidden"
    >
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-semibold text-[#023466]">Step {current} of {total}</span>
        <span className="min-w-0 truncate text-right text-gray-700">{label}</span>
      </div>
      <div
        role="progressbar"
        aria-label="Booking progress"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        className="mt-3 h-2 overflow-hidden rounded-full bg-white ring-1 ring-blue-200"
      >
        <span className="block h-full bg-[#023466]" style={{ width: `${progress}%` }} />
      </div>
    </section>
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

export const touchTargetClass = 'min-h-11';
