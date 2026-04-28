/**
 * URL к файлам из `public/` с учётом `import.meta.env.BASE_URL` (подпапка при деплое).
 */
export function publicAssetUrl(path: string): string {
  const clean = path.replace(/^\/+/, '');
  const base = import.meta.env.BASE_URL ?? '/';
  if (base === '/') return `/${clean}`;
  return `${base.endsWith('/') ? base : `${base}/`}${clean}`;
}
