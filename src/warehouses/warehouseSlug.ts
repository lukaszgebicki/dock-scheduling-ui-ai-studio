export function createWarehouseId(name: string): string {
  if (!name) return '';
  let id = name.trim();
  if (!id) return '';

  id = id.replace(/ł/g, 'l').replace(/Ł/g, 'L');
  id = id.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  id = id.toLowerCase();
  id = id.replace(/[^a-z0-9]+/g, '-');
  id = id.replace(/^-+|-+$/g, '');

  return id;
}
