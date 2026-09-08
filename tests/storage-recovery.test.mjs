import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../src/store.js', import.meta.url), 'utf8').replaceAll('export ', '');
function harness() {
  let opens = 0; let failOpen = true; let transaction;
  const db = { close() {}, transaction() {
    transaction = { error: new Error('Cancelled'), abort() { this.aborted = true; }, objectStore(name) { return { clear() { if (name === 'articles') throw new Error('Cannot clear'); } }; } };
    return transaction;
  } };
  const indexedDB = { open() {
    opens++; const req = { result: db, error: new Error('Temporarily unavailable') };
    queueMicrotask(() => failOpen ? req.onerror() : req.onsuccess()); return req;
  } };
  const context = vm.createContext({ indexedDB }); vm.runInContext(source, context);
  return { context, db, recover() { failOpen = false; }, get opens() { return opens; }, get transaction() { return transaction; } };
}
test('a failed database open can be retried, and a version change reopens the connection', async () => {
  const h = harness(); await assert.rejects(h.context.openDB());
  h.recover(); await h.context.openDB(); assert.equal(h.opens, 2);
  h.db.onversionchange(); await h.context.openDB(); assert.equal(h.opens, 3);
});
test('clear-all aborts earlier clears when a later store throws', async () => {
  const h = harness(); h.recover();
  await assert.rejects(h.context.clearAll(), /Cannot clear/);
  assert.equal(h.transaction.aborted, true);
});
test('aborted work rejects and request failures are observed immediately', async () => {
  const h = harness(); h.recover(); await h.context.openDB();
  const work = h.context.tx(['items'], 'readwrite', () => Promise.reject(new Error('Duplicate')));
  await assert.rejects(work, /Duplicate/);
  h.transaction.onabort();
  const abort = h.context.tx(['items'], 'readwrite', () => undefined);
  await Promise.resolve(); h.transaction.onabort();
  await assert.rejects(abort, /Cancelled/);
});
