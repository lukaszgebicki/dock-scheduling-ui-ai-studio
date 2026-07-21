export function RoutePlaceholder({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm text-center">
        <h1 className="text-2xl font-bold mb-4">{title}</h1>
        <p className="text-gray-600 mb-6" data-testid="route-placeholder">
          This is a placeholder for the {title} screen.
        </p>
      </div>
    </div>
  );
}
