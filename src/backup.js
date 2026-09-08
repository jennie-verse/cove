/* cove — backup.js
   JSON backup export/import (schema-checked), merge vs replace restore.
*/

import * as store from './store.js';
import { normalizeUrlKey, normalizeTags, hostFromUrl } from './url.js';
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
  const ids = new Map();
  for (const name of ['folders', 'items', 'annotations']) {
    const rows = data[name] ?? (name === 'annotations' ? [] : null);
    if (!Array.isArray(rows)) throw new Error(`Invalid ${name} in this backup.`);
    const seen = new Set();
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row)
          || typeof row.id !== 'string' || !row.id || seen.has(row.id))
        throw new Error(`Missing or duplicate id in ${name}.`);
      seen.add(row.id);
      if (name === 'folders' && (typeof row.name !== 'string' || !row.name.trim()))
        throw new Error('A folder has no name.');
      if (name === 'items') {
        if (!normalizeUrlKey(row.url)) throw new Error('A link has an invalid URL.');
        if (row.tags !== undefined && !Array.isArray(row.tags)) throw new Error('A link has invalid tags.');
        if (row.state !== undefined && !['inbox', 'reading', 'done'].includes(row.state))
          throw new Error('A link has an invalid reading status.');
        for (const key of ['title', 'note']) {
          if (row[key] !== undefined && typeof row[key] !== 'string') throw new Error(`A link has invalid ${key}.`);
        }
      }
    }
    ids.set(name, seen);
  }
  for (const annotation of data.annotations || []) {
    if (!ids.get('items').has(annotation.itemId)) throw new Error('An annotation refers to a missing link.');
  }
  if (data.journalSessions !== undefined) validateSessionLedger(data.journalSessions);
  return data;
}
export async function restoreBackup(file, mode = 'merge') {
  if (!['merge', 'replace'].includes(mode)) throw new Error('Unsupported restore mode.');
  const data = validateBackup(JSON.parse(await file.text()));
  const replace = mode === 'replace';
  const [existingFolders, existingItems, existingAnnotations] = replace ? [[], [], []]
    : await Promise.all(['folders', 'items', 'annotations'].map((name) => store.all(name)));
  const folders = [...existingFolders], items = [...existingItems], annotations = [...existingAnnotations];
  const folderMap = new Map();
  for (const f of data.folders) {
    const match = folders.find(
      (e) => e.name.toLocaleLowerCase() === String(f.name).toLocaleLowerCase(),
    );
    const next = match || { ...f, id: folders.some((e) => e.id === f.id) ? store.makeId('f') : f.id };
    if (!match) folders.push(next);
    folderMap.set(f.id, next.id);
  }
  for (const raw of data.items) {
    const key = normalizeUrlKey(raw.url),
      existing = items.find((item) => item.urlKey === key);
    const next = {
      ...existing,
      ...raw,
      id: existing?.id || (items.some((item) => item.id === raw.id) ? store.makeId('c') : raw.id),
      urlKey: key,
      host: hostFromUrl(raw.url),
      title: raw.title || existing?.title || '',
      state: raw.state || existing?.state || 'inbox',
      addedAt: Number(raw.addedAt) || existing?.addedAt || Date.now(),
      folderId: folderMap.get(raw.folderId) || existing?.folderId || null,
      tags: normalizeTags([...(existing?.tags || []), ...(raw.tags || [])]),
      note: !raw.note || existing?.note === raw.note || existing?.note?.endsWith(`\n\n${raw.note}`)
        ? existing?.note || '' : [existing?.note, raw.note].filter(Boolean).join('\n\n'),
      hasArticle: Boolean(existing?.hasArticle),
      updatedAt: Date.now(),
    };
    if (existing) items[items.indexOf(existing)] = next;
    else items.push(next);
    for (const a of (data.annotations || []).filter((a) => a.itemId === raw.id)) {
      const previous = annotations.find((row) => row.id === a.id);
      const annotation = { ...a, id: previous && previous.itemId !== next.id ? store.makeId('a') : a.id, itemId: next.id };
      if (previous?.itemId === next.id) annotations[annotations.indexOf(previous)] = annotation;
      else annotations.push(annotation);
    }
  }
  await store.commitBackup({ folders, items, annotations }, replace);
  if (data.journalSessions !== undefined) replaceSessionLedger(data.journalSessions, { merge: mode !== 'replace' });
  return data.items.length;
}
