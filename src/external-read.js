/* cove — external-read.js
   Approximate reading time for links opened outside Cove (Open in Safari).

   We cannot observe when the user stops reading an external page, so this is
   deliberately an approximation: it only measures "how long Cove was in the
   background between the tap and the next time it came back to the
   foreground", discards anything implausibly short or long, and is always
   tagged historyAccuracy: "approximate" / source: "external" so Daybook can
   mark it with a tilde and never confuse it with an exact in-app Reader
   session. Kept as a standalone module (rather than inline in app.js) so the
   pure logic can be unit tested without a DOM.
*/
export const EXTERNAL_PENDING_KEY = 'cove.pendingExternalRead.v1';
export const EXTERNAL_MIN_MS = 30 * 1000;
export const EXTERNAL_MAX_MS = 60 * 60 * 1000;

export function readPendingExternal() {
  try {
    const raw = localStorage.getItem(EXTERNAL_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.itemId || !Number.isFinite(Number(parsed.startedAt))) return null;
    return parsed;
  } catch { return null; }
}
export function writePendingExternal(pending) {
  try { localStorage.setItem(EXTERNAL_PENDING_KEY, JSON.stringify(pending)); } catch { /* best effort */ }
}
export function clearPendingExternal() {
  try { localStorage.removeItem(EXTERNAL_PENDING_KEY); } catch { /* best effort */ }
}
export function externalReadIso(ms) {
  const date = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${String(date.getMilliseconds()).padStart(3, '0')}${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
}

/**
 * Given a pending { itemId, title, startedAt } and the current time, decide
 * what (if anything) should be recorded. Pure function — no storage, no
 * Journal — so the three cases in the spec (too short / normal / too long)
 * are each directly testable.
 *   - elapsed < 30s        -> null (discard, likely a mis-tap)
 *   - 30s <= elapsed <= 60m -> a reading-session record with a duration
 *   - elapsed > 60m         -> a reading-session record with NO duration
 *     (start time only — never invent a capped 60-minute duration)
 */
export function buildExternalRecord(pending, nowMs = Date.now()) {
  if (!pending?.itemId || !Number.isFinite(Number(pending.startedAt))) return null;
  const startedAt = Number(pending.startedAt);
  const elapsed = nowMs - startedAt;
  if (!Number.isFinite(elapsed) || elapsed < EXTERNAL_MIN_MS) return null;
  const date = externalReadIso(startedAt).slice(0, 10);
  const baseData = {
    itemId: String(pending.itemId), itemType: 'article',
    startedAt: externalReadIso(startedAt),
    contentIncluded: pending.contentIncluded === true, historyAccuracy: 'approximate', source: 'external',
  };
  const data = elapsed > EXTERNAL_MAX_MS
    ? { ...baseData, activeSeconds: 0 }
    : { ...baseData, endedAt: externalReadIso(nowMs), activeSeconds: Math.round(elapsed / 1000) };
  return {
    id: `${pending.itemId}:ext:${date}:${startedAt}`,
    kind: 'reading-session',
    at: externalReadIso(startedAt),
    updatedAt: externalReadIso(nowMs),
    deleted: false,
    title: pending.contentIncluded === true ? String(pending.title || 'Untitled') : 'Cove article',
    data,
  };
}

/** Reads and clears the pending marker, then hands any resulting record to `onRecord`. */
export async function finalizePendingExternalRead(onRecord) {
  const pending = readPendingExternal();
  if (!pending) return null;
  clearPendingExternal();
  const record = buildExternalRecord(pending);
  if (record && typeof onRecord === 'function') await onRecord(record);
  return record;
}
