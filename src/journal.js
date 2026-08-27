/* cove — journal.js
   Stage 3 — Daybook activity recording. Off by default; failures here must never block saving.
*/

import * as sync from './sync.js';
const ENABLED = 'cove.journalEnabled',
  CONTENT = 'cove.journalContent',
  LEDGER = 'cove.journalActivity.v1';
const read = () => {
  try {
    return JSON.parse(localStorage.getItem(LEDGER) || '[]');
  } catch {
    return [];
  }
};
const write = (rows) => localStorage.setItem(LEDGER, JSON.stringify(rows.slice(-1000)));
export const isEnabled = () => localStorage.getItem(ENABLED) === '1';
export const contentIncluded = () => localStorage.getItem(CONTENT) === '1';
export function configure(enabled, includeContent = false) {
  localStorage.setItem(ENABLED, enabled ? '1' : '0');
  localStorage.setItem(CONTENT, includeContent ? '1' : '0');
}
function localIso(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value),
    pad = (n) => String(Math.abs(n)).padStart(2, '0'),
    off = -d.getTimezoneOffset(),
    sign = off >= 0 ? '+' : '-';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
}
export async function record(kind, item, data = {}, at = new Date()) {
  const timestamp = localIso(at);
  const row = {
    id: `${kind}:${item?.id || 'cove'}:${at.getTime()}`,
    kind,
    at: timestamp,
    updatedAt: timestamp,
    deleted: false,
    title: String(item?.title || item?.host || 'Cove'),
    data: { itemId: item?.id || 'cove', ...data },
  };
  write([...read(), row]);
  if (!isEnabled() || !sync.isEnabled()) return false;
  try {
    const module = await import('../../shared/v2/journal.js');
    const client = module.createJournalClient({
      app: 'cove',
      context: sync.getContext(),
      namespace: 'cove-journal',
      isEnabled,
      resolveConfig: async () => {
        const owner = location.hostname.match(/^([a-z0-9-]+)\.github\.io$/i)?.[1] || 'jennie-verse';
        return { owner, repo: 'webapp-data', branch: 'main', token: sync.getToken() };
      },
    });
    await client.enqueue(row, { date: module.localDate(at) });
    return true;
  } catch {
    return false;
  }
}
export async function backfill(items) {
  if (!isEnabled()) return 0;
  let count = 0;
  for (const item of items) {
    await record('link-saved', item, { importedHistory: true }, new Date(item.addedAt));
    count++;
  }
  return count;
}
