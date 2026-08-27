/* cove — settings.js
   Settings screen — text size, sort default, auto-tidy, folders, backup/restore, shortcut info, danger zone, about.
*/

import * as store from './store.js';
import { el, toast, openModal, closeModal, modalLayout } from './ui.js';
import { exportBackup, restoreBackup } from './backup.js';
import { manageFolders } from './folders.js';
import { importHtmlFiles } from './import.js';
import { releaseOldArticles } from './retention.js';
import * as sync from './sync.js';
import * as journal from './journal.js';
const sizes = [6, 8, 10, 12, 14, 17];
export function applyFontStep() {
  const step = Math.max(1, Math.min(6, Number(localStorage.getItem('cove.fontStep') || 4)));
  document.documentElement.style.setProperty('--font', `${sizes[step - 1]}px`);
}
const row = (label, value, action, extra = null) =>
  el('button', { class: 'row', type: 'button', onclick: action }, [
    el('span', { class: 'row-label', text: label }),
    el('span', { class: 'row-value', text: value }),
    extra || el('span', { text: '›', 'aria-hidden': 'true' }),
  ]);
export async function renderSettings(main, { onBack, onChange }) {
  main.className = 'settings-view';
  main.replaceChildren(
    el('h1', { class: 'view-title', text: 'Settings' }),
    el('p', { class: 'lede', text: 'Cove stays local unless you turn on Sync.' }),
  );
  const display = el('section', { class: 'section' });
  display.append(
    row('Text size', `${sizes[Number(localStorage.getItem('cove.fontStep') || 4) - 1]}px`, () =>
      fontDialog(onChange),
    ),
    row('Sort default', sortLabel(localStorage.getItem('cove.sort') || 'added-desc'), () =>
      sortDialog(onChange),
    ),
  );
  const reading = el('section', { class: 'section' });
  const articles = await store.all('articles');
  reading.append(
    row(
      'Storage',
      `${articles.length} saved article${articles.length === 1 ? '' : 's'}`,
      async () => {
        const result = await releaseOldArticles(30);
        toast(`Released ${result.count} old article${result.count === 1 ? '' : 's'}.`);
        onChange();
      },
    ),
    row(
      'Auto-tidy',
      localStorage.getItem('cove.autoTidy') === 'on' ? 'On · after 6 months' : 'Off',
      () => {
        const on = localStorage.getItem('cove.autoTidy') !== 'on';
        localStorage.setItem('cove.autoTidy', on ? 'on' : 'off');
        toast(`Auto-tidy ${on ? 'on' : 'off'}.`);
        renderSettings(main, { onBack, onChange });
      },
    ),
    row('Import HTML', 'Saved article files', () =>
      pickFiles('.html,.htm', true, async (files) => {
        const result = await importHtmlFiles(files);
        toast(
          `${result.filter((r) => r.ok).length} article${result.filter((r) => r.ok).length === 1 ? '' : 's'} imported.`,
        );
        onChange();
      }),
    ),
  );
  const organize = el('section', { class: 'section' });
  organize.append(
    row('Folders', 'Manage folders', () => manageFolders(onChange)),
    row('Export backup', 'JSON · article bodies excluded', exportBackup),
    row('Restore backup', 'Merge or replace', () =>
      pickFiles('.json', false, async (files) => restoreDialog(files[0], onChange)),
    ),
  );
  const connect = el('section', { class: 'section' });
  connect.append(
    row('Sync', sync.isEnabled() ? `On · ${sync.tokenHint()}` : 'Off', () => syncDialog(onChange)),
    row(
      'Sync now',
      sync.getLastSync() ? `Last ${new Date(sync.getLastSync()).toLocaleString()}` : 'Not synced',
      async () => {
        try {
          const count = await sync.syncNow();
          toast(`${count} items synced.`);
          onChange();
        } catch (e) {
          toast(e.message);
        }
      },
    ),
    row('Journal', journal.isEnabled() ? 'On · Daybook' : 'Off', () => journalDialog(onChange)),
    row('Shortcut', 'Copy Save to cove URL', async () => {
      await navigator.clipboard.writeText(
        'https://jennie-verse.github.io/cove/?add=[URL]&title=[TITLE]',
      );
      toast('Shortcut URL copied.');
    }),
  );
  const danger = el('section', { class: 'section' });
  danger.append(
    row('Delete all items', 'Two confirmations', async () => {
      if (
        confirm('Delete every Cove item?') &&
        confirm('This cannot be undone. Delete all items now?')
      ) {
        await store.clearAll();
        toast('All Cove data deleted.');
        onChange();
        onBack();
      }
    }),
  );
  main.append(
    sectionTitle('Display'),
    display,
    sectionTitle('Reading'),
    reading,
    sectionTitle('Library & data'),
    organize,
    sectionTitle('Connections'),
    connect,
    sectionTitle('Danger'),
    danger,
  );
}
const sectionTitle = (text) => el('h2', { class: 'settings-group-title', text });
const sortLabel = (v) =>
  ({ 'added-desc': 'Newest first', 'added-asc': 'Oldest first', title: 'Title', domain: 'Domain' })[
    v
  ] || v;
function fontDialog(onChange) {
  const input = el('input', {
    type: 'range',
    min: '1',
    max: '6',
    value: localStorage.getItem('cove.fontStep') || 4,
  });
  openModal(
    modalLayout(
      'Text size',
      el('label', { class: 'field' }, [
        el('span', { text: '6 steps · controls stay touch-friendly' }),
        input,
      ]),
      [
        el('button', {
          class: 'soft-btn',
          type: 'button',
          text: 'Reset',
          onclick: () => {
            input.value = 4;
          },
        }),
        el('button', {
          class: 'primary-btn',
          type: 'button',
          text: 'Save',
          onclick: () => {
            localStorage.setItem('cove.fontStep', input.value);
            applyFontStep();
            closeModal();
            onChange();
          },
        }),
      ],
    ),
  );
}
function sortDialog(onChange) {
  const select = el(
    'select',
    {},
    ['added-desc', 'added-asc', 'title', 'domain'].map((v) =>
      el('option', {
        value: v,
        text: sortLabel(v),
        selected: (localStorage.getItem('cove.sort') || 'added-desc') === v,
      }),
    ),
  );
  openModal(
    modalLayout(
      'Sort default',
      el('label', { class: 'field' }, [el('span', { text: 'Default order' }), select]),
      [
        el('button', {
          class: 'primary-btn',
          type: 'button',
          text: 'Save',
          onclick: () => {
            localStorage.setItem('cove.sort', select.value);
            closeModal();
            onChange();
          },
        }),
      ],
    ),
  );
}
function pickFiles(accept, multiple, handler) {
  const p = document.querySelector('#filePicker');
  p.accept = accept;
  p.multiple = multiple;
  p.value = '';
  p.onchange = () => handler([...p.files]);
  p.click();
}
function restoreDialog(file, onChange) {
  if (!file) return;
  const body = el('p', { text: 'Merge keeps local items. Replace deletes local data first.' });
  openModal(
    modalLayout('Restore backup', body, [
      el('button', {
        class: 'soft-btn',
        type: 'button',
        text: 'Merge',
        onclick: async () => {
          const n = await restoreBackup(file, 'merge');
          closeModal();
          toast(`${n} items restored.`);
          onChange();
        },
      }),
      el('button', {
        class: 'outline-btn danger',
        type: 'button',
        text: 'Replace',
        onclick: async () => {
          if (confirm('Replace all local Cove data?')) {
            const n = await restoreBackup(file, 'replace');
            closeModal();
            toast(`${n} items restored.`);
            onChange();
          }
        },
      }),
    ]),
  );
}
function syncDialog(onChange) {
  const token = el('input', { type: 'password', placeholder: 'Fine-grained GitHub token' }),
    device = el('input', {
      type: 'text',
      placeholder: 'Device name',
      value: localStorage.getItem('cove.syncContextLabel') || '',
    });
  const body = el('div', {}, [
    el('p', {
      class: 'help',
      text: 'Sync uploads link metadata and annotations to the private webapp-data repository. Article bodies are never uploaded.',
    }),
    el('label', { class: 'field' }, [el('span', { text: 'Device name' }), device]),
    el('label', { class: 'field' }, [el('span', { text: 'Access token' }), token]),
  ]);
  openModal(
    modalLayout('Sync', body, [
      sync.isEnabled()
        ? el('button', {
            class: 'soft-btn',
            type: 'button',
            text: 'Turn off',
            onclick: () => {
              sync.disable();
              closeModal();
              onChange();
            },
          })
        : null,
      el('button', {
        class: 'primary-btn',
        type: 'button',
        text: 'Turn on',
        onclick: () => {
          if (!token.value.trim() || !device.value.trim()) {
            toast('Enter a device name and token.');
            return;
          }
          sync.configure({ token: token.value, device: device.value });
          closeModal();
          onChange();
        },
      }),
    ]),
  );
}
function journalDialog(onChange) {
  const include = el('input', { type: 'checkbox' });
  const body = el('div', {}, [
    el('p', {
      class: 'help',
      text: 'Daybook receives daily activity counts. Quote and note bodies stay in Cove unless you opt in.',
    }),
    el('label', { class: 'field' }, [
      el('span', { text: 'Include quote and note bodies' }),
      include,
    ]),
  ]);
  openModal(
    modalLayout('Journal', body, [
      journal.isEnabled()
        ? el('button', {
            class: 'soft-btn',
            type: 'button',
            text: 'Turn off',
            onclick: () => {
              journal.configure(false);
              closeModal();
              onChange();
            },
          })
        : null,
      el('button', {
        class: 'primary-btn',
        type: 'button',
        text: 'Turn on',
        onclick: async () => {
          if (!sync.isEnabled()) {
            toast('Turn on Sync first.');
            return;
          }
          journal.configure(true, include.checked);
          const items = await store.all('items');
          await journal.backfill(items);
          closeModal();
          toast('Journal on. Earlier activity was backfilled once.');
          onChange();
        },
      }),
    ]),
  );
}
