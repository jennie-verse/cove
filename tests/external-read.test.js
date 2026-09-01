import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExternalRecord, finalizePendingExternalRead, readPendingExternal,
  writePendingExternal, clearPendingExternal, EXTERNAL_MIN_MS, EXTERNAL_MAX_MS,
} from '../src/external-read.js';

function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}
function withStorage(fn) {
  const original = globalThis.localStorage;
  globalThis.localStorage = makeStorage();
  try { return fn(); } finally { globalThis.localStorage = original; }
}

test('elapsed under 30s is discarded (no record)', () => {
  const pending = { itemId: 'item-1', title: 'Article', startedAt: 1000 };
  const record = buildExternalRecord(pending, 1000 + EXTERNAL_MIN_MS - 1);
  assert.equal(record, null);
});

test('elapsed within bounds produces an approximate record with a duration', () => {
  const startedAt = Date.parse('2026-08-31T20:10:00-04:00');
  const pending = { itemId: 'item-1', title: 'Article title', startedAt };
  const record = buildExternalRecord(pending, startedAt + 22 * 60 * 1000);
  assert.ok(record);
  assert.equal(record.kind, 'reading-session');
  assert.equal(record.data.historyAccuracy, 'approximate');
  assert.equal(record.data.source, 'external');
  assert.equal(record.data.activeSeconds, 22 * 60);
  assert.ok(record.data.endedAt, 'a normal-length read must carry an endedAt');
  assert.equal(record.title, 'Cove article');
  assert.equal(record.data.contentIncluded, false);
});

test('external title is included only after the Journal content opt-in', () => {
  const startedAt = 1000;
  const record = buildExternalRecord(
    { itemId: 'item-private', title: 'Private title', startedAt, contentIncluded: true },
    startedAt + EXTERNAL_MIN_MS,
  );
  assert.equal(record.title, 'Private title');
  assert.equal(record.data.contentIncluded, true);
});

test('elapsed over the 60-minute cap produces a record with no duration, and is not clamped to 60m', () => {
  const startedAt = Date.parse('2026-08-31T20:10:00-04:00');
  const pending = { itemId: 'item-1', title: 'Article title', startedAt };
  const record = buildExternalRecord(pending, startedAt + EXTERNAL_MAX_MS + 5 * 60 * 1000);
  assert.ok(record);
  assert.equal(record.data.activeSeconds, 0);
  assert.equal(record.data.endedAt, undefined, 'no endedAt/duration must be invented past the cap');
  assert.equal(record.data.historyAccuracy, 'approximate');
});

test('exactly at the minimum boundary is kept, one millisecond under is not', () => {
  const pending = { itemId: 'item-1', title: 'A', startedAt: 0 };
  assert.ok(buildExternalRecord(pending, EXTERNAL_MIN_MS));
  assert.equal(buildExternalRecord(pending, EXTERNAL_MIN_MS - 1), null);
});

test('pending survives a write/read round trip and is cleared after finalizing', () => withStorage(async () => {
  const startedAt = Date.now() - 5 * 60 * 1000;
  writePendingExternal({ itemId: 'item-2', title: 'Round trip', startedAt });
  assert.ok(readPendingExternal());
  const records = [];
  const record = await finalizePendingExternalRead((r) => { records.push(r); });
  assert.equal(records.length, 1);
  assert.equal(record.data.itemId, 'item-2');
  assert.equal(readPendingExternal(), null, 'pending must be cleared after finalizing');
}));

test('finalizing with no pending does nothing', () => withStorage(async () => {
  clearPendingExternal();
  const record = await finalizePendingExternalRead(() => { throw new Error('must not be called'); });
  assert.equal(record, null);
}));

test('in-app Cove Reader sessions keep historyAccuracy "exact" (recorded separately, not via this module)', async () => {
  const { readFile } = await import('node:fs/promises');
  const src = await readFile(new URL('../src/reader.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /historyAccuracy:\s*['"]approximate['"]/, 'the in-app Reader path must not be downgraded to approximate');
});
