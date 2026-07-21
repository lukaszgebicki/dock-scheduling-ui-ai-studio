export function getSafePostLoginPath(state: unknown): string {
  if (!state || typeof state !== 'object') {
    return '/';
  }

  const from = (state as Record<string, unknown>).from;
  if (typeof from !== 'string' || !from) {
    return '/';
  }

  if (
    !from.startsWith('/') ||
    from.startsWith('//') ||
    from.includes('?') ||
    from.includes('#') ||
    from === '/login' ||
    from.includes('://') ||
    from.startsWith('javascript:') ||
    from.startsWith('data:')
  ) {
    return '/';
  }

  return from;
}
