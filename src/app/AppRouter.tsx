import React from 'react';
import { BrowserRouter } from 'react-router';
import { AppRoutes } from './AppRoutes';

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
