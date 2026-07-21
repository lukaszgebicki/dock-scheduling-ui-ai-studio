import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#000A32] px-4 py-10 sm:px-6 lg:px-8">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-2 bg-[#FF9166]"
      />
      <div
        aria-hidden="true"
        className="absolute -right-24 top-16 h-64 w-64 rounded-full bg-[#7FA5D0] opacity-20"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[#D9D9C4] opacity-10"
      />

      <div className="relative w-full max-w-md">
        <p className="mb-5 text-center text-sm font-semibold uppercase tracking-[0.2em] text-white">
          Dock Scheduling
        </p>
        <section className="rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
          {children}
        </section>
      </div>
    </main>
  );
}
