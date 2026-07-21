import React from 'react';

export function AuthBootstrapScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div role="status" aria-live="polite" className="text-gray-600">
        Restoring session…
      </div>
    </div>
  );
}
