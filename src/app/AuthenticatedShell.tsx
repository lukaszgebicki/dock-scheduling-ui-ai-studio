import React from 'react';
import { useAuth } from '../auth/useAuth';

export function AuthenticatedShell() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm text-center">
        <h1 className="text-2xl font-bold mb-4">Authenticated application shell</h1>
        <p className="text-gray-600 mb-6">
          You have successfully authenticated to access the protected features of the application.
        </p>
        <button
          onClick={() => void logout()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
