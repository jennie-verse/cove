/* cove — url.js
   URL normalization (urlKey) and protocol validation. Only http/https URLs are ever accepted.
*/

export const TRACKING_PARAMS = ['fbclid', 'gclid', 'igshid', 'ref', 'ref_src'];
export function parseHttpUrl(value) {
  try {
    const url = new URL(String(value).trim());
    return ['http:', 'https:'].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}
export function normalizeUrlKey(value) {
  const url = parseHttpUrl(value);
  if (!url) return '';
  url.hash = '';
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  [...url.searchParams.keys()].forEach((key) => {
    if (key.toLowerCase().startsWith('utm_') || TRACKING_PARAMS.includes(key.toLowerCase()))
      url.searchParams.delete(key);
  });
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/$/, '');
  url.searchParams.sort();
  return url.toString();
}
export function hostFromUrl(value) {
  const url = parseHttpUrl(value);
  return url ? url.hostname.replace(/^www\./, '') : '';
}
export function normalizeTags(value) {
  return [
    ...new Set(
      (Array.isArray(value) ? value : String(value || '').split(/[,\s]+/))
        .map((v) => String(v).trim().replace(/^#/, '').toLocaleLowerCase())
        .filter(Boolean),
    ),
  ].slice(0, 8);
}
