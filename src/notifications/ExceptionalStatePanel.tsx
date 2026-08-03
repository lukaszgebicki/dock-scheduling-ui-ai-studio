import React from 'react';
import type { ExceptionalStateDefinition } from './notificationDomain';

export function ExceptionalStatePanel({
  state,
  onSafeAction,
}: {
  state: ExceptionalStateDefinition;
  onSafeAction: (state: ExceptionalStateDefinition) => void;
}) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm" aria-labelledby={`exception-${state.id}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#023466]">Exceptional state</p>
      <h3 id={`exception-${state.id}`} className="mt-1 font-semibold text-gray-900">{state.title}</h3>
      <p className="mt-2 text-sm text-gray-600">{state.description}</p>
      <button
        type="button"
        onClick={() => onSafeAction(state)}
        className="mt-4 rounded-md border border-[#023466] px-3 py-2 text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]"
      >
        {state.actionLabel}
      </button>
    </article>
  );
}
