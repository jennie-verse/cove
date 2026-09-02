/* cove — journal.js
   Stage 3 — Daybook activity recording. Off by default; failures here must never block saving.
*/

import * as sync from './sync.js';
import { createSessionLedger } from './activity-session.js';
const ENABLED = 'cove.journalEnabled',
  CONTENT = 'cove.journalContent',
  LEDGER = 'cove.journalActivity.v1';
const sessionLedger = createSessionLedger('cove.journalSessions.v1');
const read = () => {
  try {
    return JSON.parse(localStorage.getItem(LEDGER) || '[]');
  } catch {
    return [];
  }
};
const write = (rows) => localStorage.setItem(LEDGER, JSON.stringify(rows.slice(-1000)));
function journalConfig() {
  const owner = location.hostname.match(/^([a-z0-9-]+)\.github\.io$/i)?.[1];
  if (!owner) throw Object.assign(new Error('Cannot determine the GitHub account from this deployment.'), { code: 'CONFIGURATION' });
  return { owner, repo: 'webapp-data', branch: 'main', token: sync.getToken() };
}
export const isEnabled = () => localStorage.getItem(ENABLED) === '1';
export const contentIncluded = () => localStorage.getItem(CONTENT) === '1';
export function configure(enabled, includeContent = false) {
  localStorage.setItem(ENABLED, enabled ? '1' : '0');
  localStorage.setItem(CONTENT, includeContent ? '1' : '0');
  reportStatus({ journalEnabled: enabled, contentIncluded: includeContent, enabledAt: enabled ? localIso() : undefined }).catch(() => {});
}
export async function reportStatus(extra = {}) {
  if (!sync.isEnabled() || !sync.getContext()) return false;
  try {
    const module = await import('../../shared/v2/journal.js');
    const client = module.createJournalClient({
      app: 'cove',
      context: sync.getContext(),
      namespace: 'cove-journal',
      isEnabled,
      resolveConfig: async () => journalConfig(),
    });
    await client.reportStatus({ journalEnabled: isEnabled(), contentIncluded: contentIncluded(), ...extra });
    return true;
  } catch {
    return false;
  }
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
      resolveConfig: async () => journalConfig(),
    });
    await client.enqueue(row, { date: module.localDate(at) });
    return true;
  } catch {
    return false;
  }
}
export const exportSessionLedger = () => sessionLedger.read();
export const validateSessionLedger = (rows) => sessionLedger.validate(rows);
export const replaceSessionLedger = (rows, options = {}) => sessionLedger.replace(rows, options);
// Projects a highlight or a whole-article note into the journal (Daybook
// gap fix): addAnnotation() only wrote to Cove's own IndexedDB, so neither
// highlights, highlight+note pairs, nor whole-document notes ever reached
// Daybook even with Journal turned on. Mirrors folio's projectAnnotation —
// a highlight's own note (if any) rides along on the SAME record as its
// quote (kind stays highlight-created/-updated), while a note made with no
// selected text (annotation.kind === 'note') is its own note-created/-updated
// record with no quote, so Daybook can tell the two apart.
export async function recordAnnotation(annotation, item, event = 'created') {
  if (!annotation?.id || !item?.id) return false;
  const kind = annotation.kind === 'note'
    ? (event === 'updated' ? 'note-updated' : 'note-created')
    : (event === 'updated' ? 'highlight-updated' : 'highlight-created');
  const includeContent = contentIncluded();
  const quote = includeContent ? String(annotation.quote || '').trim() : '';
  const note = includeContent ? String(annotation.note || '').trim() : '';
  return record(kind, item, {
    annotationId: annotation.id,
    ...(annotation.color ? { color: annotation.color } : {}),
    ...(quote ? { quote } : {}),
    ...(note ? { note } : {}),
    contentIncluded: includeContent,
  });
}
export async function recordSession(row) {
  if (!row?.id || row.kind !== 'reading-session') return false;
  sessionLedger.replace([row], { merge: true });
  if (!isEnabled() || !sync.isEnabled()) return false;
  try {
    const module = await import('../../shared/v2/journal.js');
    if (!module.JOURNAL_KINDS?.cove?.includes('reading-session')) return false;
    const client = module.createJournalClient({ app: 'cove', context: sync.getContext(), namespace: 'cove-journal', isEnabled, resolveConfig: async () => journalConfig() });
    await client.enqueue(row, { date: row.at.slice(0, 10) });
    return true;
  } catch { return false; }
}
export async function backfill(items) {
  if (!isEnabled()) return 0;
  let count = 0;
  for (const item of items) {
    await record('link-saved', item, { importedHistory: true }, new Date(item.addedAt));
    count++;
  }
  for (const row of sessionLedger.read()) { await recordSession(row); count++; }
  await reportStatus({ lastSuccessfulWriteAt: localIso() });
  return count;
}
