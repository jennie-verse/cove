/* cove — backup.js
   JSON backup export/import (schema-checked), merge vs replace restore.
*/

import * as store from './store.js';
import { normalizeUrlKey, normalizeTags } from './url.js';
import { download } from './ui.js';
import { exportSessionLedger, replaceSessionLedger, validateSessionLedger } from './journal.js';
export async function buildBackup() {
  const [folders, items, annotations] = await Promise.all([
    store.all('folders'),
    store.all('items'),
    store.all('annotations'),
  ]);
  return {
    app: 'cove',
    schema: 3,
    exportedAt: new Date().toISOString(),
    folders,
    items,
    annotations,
    journalSessions: exportSessionLedger(),
    settings: {
      fontStep: Number(localStorage.getItem('cove.fontStep') || 4),
      sort: localStorage.getItem('cove.sort') || 'added-desc',
      retention: localStorage.getItem('cove.retention') || 'off',
    },
  };
}
export async function exportBackup() {
  download(
    `cove-backup-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(await buildBackup(), null, 2),
    'application/json',
  );
}
export function validateBackup(data) {
  if (
    !data ||
    data.app !== 'cove' ||
    ![1, 2, 3].includes(Number(data.schema)) ||
    !Array.isArray(data.items) ||
    !Array.isArray(data.folders)
  )
    throw new Error('This is not a supported Cove backup.');
  if (data.journalSessions !== undefined) validateSessionLedger(data.journalSessions);
  return data;
}
export async function restoreBackup(file, mode = 'merge') {
  const data = validateBackup(JSON.parse(await file.text()));
  if (mode === 'replace') await store.clearAll();
  const folderMap = new Map();
  const existingFolders = await store.all('folders');
  for (const f of data.folders) {
    const match = existingFolders.find(
      (e) => e.name.toLocaleLowerCase() === String(f.name).toLocaleLowerCase(),
    );
    const next = match || { ...f, id: f.id || store.makeId('f') };
    if (!match) await store.put('folders', next);
    folderMap.set(f.id, next.id);
  }
  for (const raw of data.items) {
    const key = raw.urlKey || normalizeUrlKey(raw.url),
      existing = await store.getByUrlKey(key);
    const next = {
      ...raw,
      id: existing?.id || raw.id || store.makeId('c'),
      urlKey: key,
      folderId: folderMap.get(raw.folderId) || null,
      tags: normalizeTags([...(existing?.tags || []), ...(raw.tags || [])]),
      note: [existing?.note, raw.note].filter(Boolean).join('\n\n'),
      hasArticle: Boolean(existing?.hasArticle),
      updatedAt: Date.now(),
    };
    await store.put('items', next);
    for (const a of (data.annotations || []).filter((a) => a.itemId === raw.id))
      await store.put('annotations', { ...a, id: a.id || store.makeId('a'), itemId: next.id });
  }
  if (data.journalSessions !== undefined) replaceSessionLedger(data.journalSessions, { merge: mode !== 'replace' });
  return data.items.length;
}
