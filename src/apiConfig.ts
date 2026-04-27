const configured = import.meta.env.VITE_API_BASE;

const isLocalBrowser =
  typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);

/**
 * Сайт на apex, API на поддомене — если билд без VITE_API_BASE (нет .env.production на машине сборки),
 * относительные /api/* на LiteSpeed дают 404. Fallback по hostname чинит прод без перевыкладки env.
 */
const PRODUCTION_HOST_API: Record<string, string> = {
  'gftarenatest.cc': 'https://api.gftarenatest.cc',
  'www.gftarenatest.cc': 'https://api.gftarenatest.cc',
};

function resolveApiBase(): string {
  if (typeof configured === 'string' && configured.length > 0) {
    return configured.replace(/\/+$/, '');
  }
  if (import.meta.env.DEV) {
    return '';
  }
  if (isLocalBrowser) {
    return 'http://localhost:5055';
  }
  if (typeof window !== 'undefined') {
    const mapped = PRODUCTION_HOST_API[window.location.hostname];
    if (mapped) {
      return mapped.replace(/\/+$/, '');
    }
  }
  return '';
}

export const API_BASE = resolveApiBase();
