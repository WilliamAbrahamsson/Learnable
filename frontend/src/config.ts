const rawBase = (import.meta.env as any).VITE_API_BASE_URL as string | undefined;

function normalizeBaseUrl(v?: string): string {
  let base = (v ?? '').toString().trim();
  if (!base) return 'http://localhost:5000';
  // Support shorthand like ":5000" or "localhost:5000"
  if (base.startsWith(':')) {
    const { protocol, hostname } = window.location;
    base = `${protocol}//${hostname}${base}`;
  } else if (!/^https?:\/\//i.test(base)) {
    // No protocol specified, assume current protocol
    const { protocol } = window.location;
    base = `${protocol}//${base}`;
  }
  // Remove trailing slashes
  return base.replace(/\/+$/, '');
}

export const API_BASE_URL = normalizeBaseUrl(rawBase);
