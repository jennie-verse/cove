/* cove — store.js
   IndexedDB open/read/write helpers for the `cove` database (items, folders, articles, annotations stores).
*/

const DB_NAME = 'cove',
  DB_VERSION = 3;
let dbPromise;
export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('items')) {
        const s = db.createObjectStore('items', { keyPath: 'id' });
        s.createIndex('state', 'state');
        s.createIndex('addedAt', 'addedAt');
        s.createIndex('urlKey', 'urlKey', { unique: true });
        s.createIndex('folderId', 'folderId');
        s.createIndex('tags', 'tags', { multiEntry: true });
      }
      if (!db.objectStoreNames.contains('folders'))
        db.createObjectStore('folders', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('articles'))
        db.createObjectStore('articles', { keyPath: 'itemId' });
      if (!db.objectStoreNames.contains('annotations')) {
        const s = db.createObjectStore('annotations', { keyPath: 'id' });
        s.createIndex('itemId', 'itemId');
        s.createIndex('createdAt', 'createdAt');
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); dbPromise = undefined; };
      db.onclose = () => { dbPromise = undefined; };
      resolve(db);
    };
  }).catch(error => { dbPromise = undefined; throw error; });
  return dbPromise;
}
function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function tx(storeNames, mode, work) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeNames, mode);
    let value;
    t.oncomplete = () => Promise.resolve(value).then(resolve, reject);
    t.onerror = () => reject(t.error || new Error('Database transaction failed'));
    t.onabort = () => reject(t.error || new Error('Database transaction aborted'));
    try {
      value = work(t);
      // Observe request rejection immediately, before the abort event, so a
      // handled duplicate/quota failure cannot become an unhandled rejection.
      Promise.resolve(value).catch(reject);
    } catch (e) {
      try { t.abort(); } catch {}
      reject(e);
    }
  });
}
export const all = (store) =>
  tx([store], 'readonly', (t) => request(t.objectStore(store).getAll()));
export const get = (store, key) =>
  tx([store], 'readonly', (t) => request(t.objectStore(store).get(key)));
export const put = (store, value) =>
  tx([store], 'readwrite', (t) => request(t.objectStore(store).put(value)));
export const remove = (store, key) =>
  tx([store], 'readwrite', (t) => request(t.objectStore(store).delete(key)));
export async function getByUrlKey(urlKey) {
  return tx(['items'], 'readonly', (t) =>
    request(t.objectStore('items').index('urlKey').get(urlKey)),
  );
}
export async function annotationsFor(itemId) {
  return (await all('annotations'))
    .filter((a) => a.itemId === itemId && !a.deletedAt)
    .sort((a, b) => a.createdAt - b.createdAt);
}
export async function deleteItemCascade(id) {
  return tx(['items', 'articles', 'annotations'], 'readwrite', (t) => {
    t.objectStore('items').delete(id);
    t.objectStore('articles').delete(id);
    const idx = t.objectStore('annotations').index('itemId');
    const req = idx.openCursor(IDBKeyRange.only(id));
    req.onsuccess = () => {
      const c = req.result;
      if (c) {
        c.delete();
        c.continue();
      }
    };
  });
}
export async function clearAll() {
  const names = ['items', 'folders', 'articles', 'annotations'];
  return tx(names, 'readwrite', t => names.forEach(name => t.objectStore(name).clear()));
}
/** Commit a fully prepared restore together. If any write fails, IndexedDB
    rolls back both the new records and the replace-mode clears. */
export async function commitBackup({ folders, items, annotations }, replace = false) {
  const db = await openDB();
  const names = ['items', 'folders', 'articles', 'annotations'];
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(names, 'readwrite');
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Restore cancelled. Local data was kept.'));
    try {
      if (replace) names.forEach((name) => transaction.objectStore(name).clear());
      for (const [name, rows] of Object.entries({ folders, items, annotations })) {
        rows.forEach((row) => transaction.objectStore(name).put(row));
      }
    } catch (error) {
      transaction.abort();
      reject(error);
    }
  });
}
export function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
}
