const configured = import.meta.env.VITE_API_BASE;
const isLocalBrowser =
  typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const API_BASE = (typeof configured === 'string' && configured.length
  ? configured
  : import.meta.env.DEV
    ? ''
    : isLocalBrowser
      ? 'http://localhost:5055'
      : ''
).replace(/\/+$/, '');
