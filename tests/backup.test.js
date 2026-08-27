import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBackup } from '../src/backup.js';

test('backup from a different app is rejected', () => {
  assert.throws(() => validateBackup({ app: 'tide', schema: 2, items: [], folders: [] }));
});

test('backup with an unsupported schema is rejected', () => {
  assert.throws(() => validateBackup({ app: 'cove', schema: 99, items: [], folders: [] }));
});

test('malformed backup (missing arrays) is rejected', () => {
  assert.throws(() => validateBackup({ app: 'cove', schema: 2 }));
  assert.throws(() => validateBackup(null));
});

test('a pre-fix schema-2 cove backup still validates', () => {
  const data = validateBackup({
    app: 'cove',
    schema: 2,
    exportedAt: '2026-08-27T21:00:00-05:00',
    folders: [{ id: 'f_1', name: 'Study', order: 0, createdAt: 1 }],
    items: [
      {
        id: 'c_1',
        url: 'https://example.com/a',
        urlKey: 'https://example.com/a',
        title: 'A',
        host: 'example.com',
        state: 'inbox',
        folderId: 'f_1',
        tags: [],
        note: '',
        pinned: false,
        addedAt: 1,
        openedAt: null,
        doneAt: null,
        source: 'manual',
      },
    ],
    annotations: [],
    settings: { fontStep: 4, sort: 'added-desc', retention: 'off' },
  });
  assert.equal(data.items.length, 1);
});

// A schema-1 (stage 1, before articles/annotations existed) backup must
// still be accepted — schema is only ever widened, never required.
test('a schema-1 (stage 1) backup still validates', () => {
  const data = validateBackup({ app: 'cove', schema: 1, items: [], folders: [] });
  assert.equal(data.schema, 1);
});
