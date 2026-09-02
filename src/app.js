/* cove — app.js
   Entry point and view routing — owns app State and switches between library/detail/reader/settings views.
*/

import * as store from './store.js';
import { el, icon, toast, openModal, closeModal, modalLayout } from './ui.js';
import { libraryData, renderCard, counts } from './library.js';
import { addLink, handleUrlIntake } from './intake.js';
import { folderPicker, manageFolders } from './folders.js';
import { normalizeTags } from './url.js';
import { renderReader, stopReaderSession } from './reader.js';
import { renderSettings, applyFontStep } from './settings.js';
import { exportItemMarkdown, exportItemsMarkdown } from './annotation.js';
import { autoTidy } from './retention.js';
import * as journal from './journal.js';
import * as sync from './sync.js';
import * as extRead from './external-read.js';
const State = {
  view: 'library',
  tab: localStorage.getItem('cove.lastTab') || 'inbox',
  folderId: localStorage.getItem('cove.lastFolder') || 'all',
  query: '',
  sort: localStorage.getItem('cove.sort') || 'added-desc',
  itemId: null,
  flashId: null,
};
const main = document.querySelector('#main'),
  actions = document.querySelector('#headerActions'),
  appShell = document.querySelector('#app');
const iconButton = (name, label, fn) =>
  el('button', { class: 'icon-btn', type: 'button', 'aria-label': label, onclick: fn }, [
    icon(name),
  ]);
async function render() {
  if (State.view !== 'reader') stopReaderSession();
  window.onscroll = null;
  actions.replaceChildren();
  appShell.classList.toggle('library-shell', State.view === 'library');
  if (State.view === 'library') await renderLibrary();
  else if (State.view === 'detail') await renderDetail();
  else if (State.view === 'reader') await renderReaderView();
  else if (State.view === 'settings') await renderSettingsView();
  document.querySelector('#main').focus({ preventScroll: true });
}
async function renderLibrary() {
  main.className = 'library-view';
  const data = await libraryData(State),
    c = counts(data.items);
  const folderName =
    State.folderId === 'all'
      ? 'All folders'
      : State.folderId === 'unsorted'
        ? 'Unsorted'
        : data.folders.find((f) => f.id === State.folderId)?.name || 'All folders';
  actions.append(
    el(
      'button',
      {
        class: 'folder-btn',
        type: 'button',
        onclick: () =>
          folderPicker(
            data.folders,
            State.folderId,
            (id) => {
              State.folderId = id;
              localStorage.setItem('cove.lastFolder', id);
              render();
            },
            { manage: () => manageFolders(render) },
          ),
      },
      [el('span', { text: folderName }), el('span', { text: '⌄' })],
    ),
    iconButton('settings', 'Settings', () => navigate('settings')),
  );
  const tabs = el('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Reading status' });
  for (const tab of ['inbox', 'reading', 'done']) {
    const label = tab[0].toUpperCase() + tab.slice(1) + (tab === 'done' ? '' : ` ${c[tab]}`);
    tabs.append(
      el('button', {
        class: `tab${tab === 'reading' ? ' reading' : ''}`,
        type: 'button',
        role: 'tab',
        'aria-selected': State.tab === tab,
        'aria-label': label,
        text: label,
        onclick: () => {
          State.tab = tab;
          localStorage.setItem('cove.lastTab', tab);
          render();
        },
      }),
    );
  }
  const search = el('input', {
    class: 'search',
    type: 'search',
    placeholder: 'Search',
    'aria-label': 'Search library',
    value: State.query,
  });
  let timer;
  search.addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      State.query = e.target.value;
      render();
    }, 150);
  });
  const searchWrap = el('div', { class: 'search-wrap' }, [icon('search'), search]);
  const toolbar = el('div', { class: 'toolbar' }, [
    searchWrap,
    iconButton('sort', 'Change sort', sortMenu),
    iconButton('external', 'Export shown items as Markdown', () => {
      if (!data.rows.length) {
        toast('Nothing to export in this view.');
        return;
      }
      exportItemsMarkdown(
        data.rows,
        (item) => data.folders.find((f) => f.id === item.folderId)?.name || 'Unsorted',
      );
    }),
  ]);
  const sortline = el('div', { class: 'sortline' }, [
    el('span', {
      text: `Sort: ${{ 'added-desc': 'Newest', 'added-asc': 'Oldest', title: 'Title', domain: 'Domain' }[State.sort]}`,
    }),
    el('span', { text: `${data.rows.length} shown` }),
  ]);
  const list = el('div', { class: 'list' });
  if (!data.rows.length) list.append(emptyState(data.items.length));
  else
    data.rows.forEach((item) => {
      const card = renderCard(item, data.articleMap.get(item.id), {
        onOpen: (id) => navigate('detail', id),
        onMenu: itemMenu,
      });
      if (item.id === State.flashId) {
        card.animate([{ background: '#fbe4ea' }, { background: '#fff' }], { duration: 1300 });
        State.flashId = null;
      }
      list.append(card);
    });
  main.replaceChildren(
    tabs,
    toolbar,
    sortline,
    list,
    el('div', { class: 'fab-wrap' }, [
      el('button', { class: 'primary-btn', type: 'button', onclick: addDialog }, [
        icon('plus'),
        'Add link',
      ]),
    ]),
  );
}
function emptyState(hasAny) {
  return el('div', { class: 'empty' }, [
    el('div', { class: 'empty-mark', text: '⌒' }),
    el('h2', { text: hasAny ? 'Nothing left. Nice.' : 'A quiet place for links.' }),
    el('p', {
      class: 'lede',
      text: hasAny
        ? 'Try another status or folder.'
        : 'Add a link here, or use the Save to cove shortcut from Safari.',
    }),
    !hasAny
      ? el('button', {
          class: 'soft-btn',
          type: 'button',
          text: 'How to make the shortcut',
          onclick: () => (location.href = './docs/SHORTCUT-KO.md'),
        })
      : null,
  ]);
}
async function renderDetail() {
  const item = await store.get('items', State.itemId);
  if (!item) {
    navigate('library');
    return;
  }
  const [article, folders, notes] = await Promise.all([
    store.get('articles', item.id),
    store.all('folders'),
    store.annotationsFor(item.id),
  ]);
  actions.append(iconButton('more', 'Item menu', () => itemMenu(item, 'menu')));
  const title = el('h1', { class: 'view-title', text: item.title || item.host }),
    meta = el('div', {
      class: 'meta',
      text: `${item.host}${article ? ` · ${Math.max(1, Math.ceil(article.wordCount / 220))} min read` : ''}`,
    }),
    url = el('div', { class: 'url-text', text: item.url });
  const btns = el('div', { class: 'detail-actions' });
  if (article)
    btns.append(
      el('button', {
        class: 'primary-btn',
        type: 'button',
        onclick: () => openItem(item, 'reader'),
        text: 'Read',
      }),
    );
  btns.append(
    el(
      'button',
      {
        class: article ? 'outline-btn' : 'primary-btn',
        type: 'button',
        onclick: () => openOriginal(item),
      },
      ['Open in Safari', icon('external')],
    ),
  );
  const status = el(
    'div',
    { class: 'segmented' },
    ['inbox', 'reading', 'done'].map((value) =>
      el('button', {
        type: 'button',
        class: `${value}${item.state === value ? ' active' : ''}`,
        text: value[0].toUpperCase() + value.slice(1),
        onclick: async () => {
          const now = Date.now();
          await store.put('items', {
            ...item,
            state: value,
            doneAt: value === 'done' ? now : null,
            updatedAt: now,
          });
          await journal.record('link-activity', item, {
            actions: [value === 'done' ? 'completed' : 'moved'],
          });
          render();
        },
      }),
    ),
  );
  const folder = folders.find((f) => f.id === item.folderId);
  const tags = el(
    'div',
    { class: 'tags' },
    item.tags.map((t) =>
      el('button', {
        class: 'tag',
        type: 'button',
        text: `#${t}`,
        onclick: () => {
          State.query = `#${t}`;
          navigate('library');
        },
      }),
    ),
  );
  const note = el('textarea', {
    class: 'note-area',
    'aria-label': 'Item note',
    maxlength: '2000',
    placeholder: 'Add a note…',
  });
  note.value = item.note || '';
  let saveTimer;
  note.addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      await store.put('items', { ...item, note: note.value.slice(0, 2000), updatedAt: Date.now() });
      toast('Note saved.', { timeout: 1300 });
    }, 500);
  });
  const info = el('section', { class: 'section' }, [
    detailRow('Status', status),
    detailRow(
      'Folder',
      el('button', {
        class: 'soft-btn',
        type: 'button',
        text: folder?.name || 'Unsorted',
        onclick: () =>
          folderPicker(folders, item.folderId || 'unsorted', async (id) => {
            await store.put('items', {
              ...item,
              folderId: id === 'unsorted' ? null : id,
              updatedAt: Date.now(),
            });
            render();
          }),
      }),
    ),
    detailRow(
      'Tags',
      el('div', {}, [
        tags,
        el('button', {
          class: 'mini-btn',
          type: 'button',
          text: '+ Add',
          onclick: () => editTags(item),
        }),
      ]),
    ),
    detailRow('Note', note),
  ]);
  const anno = el('section', { class: 'section' }, [
    el('div', { class: 'row' }, [
      el('span', { class: 'row-label', text: `Highlights (${notes.length})` }),
      el('span', {
        class: 'row-value',
        text: notes.length ? 'Stored with this article' : 'No annotations yet',
      }),
      el('button', {
        class: 'mini-btn',
        type: 'button',
        text: 'Export',
        onclick: () => exportItemMarkdown(item, folder?.name || 'Unsorted'),
      }),
    ]),
  ]);
  const back = el(
    'button',
    { class: 'soft-btn', type: 'button', onclick: () => navigate('library') },
    [icon('back'), 'Back'],
  );
  main.className = 'detail-view';
  main.replaceChildren(
    back,
    el('div', { class: 'detail-grid' }, [
      el('div', {}, [title, meta, url, btns, info]),
      el('div', {}, [
        anno,
        el('section', { class: 'section' }, [
          detailRow('Added', el('span', { text: new Date(item.addedAt).toLocaleString() })),
          detailRow('Source', el('span', { text: item.source })),
        ]),
      ]),
    ]),
  );
}
const detailRow = (label, value) =>
  el('div', { class: 'row' }, [el('span', { class: 'row-label', text: label }), value]);
async function renderReaderView() {
  const item = await store.get('items', State.itemId);
  if (!item) {
    navigate('library');
    return;
  }
  actions.replaceChildren();
  await renderReader(
    main,
    item,
    () => navigate('detail', item.id),
    async () => {
      const folders = await store.all('folders');
      exportItemMarkdown(item, folders.find((f) => f.id === item.folderId)?.name || 'Unsorted');
    },
  );
}
async function renderSettingsView() {
  actions.append(iconButton('back', 'Back to library', () => navigate('library')));
  await renderSettings(main, { onBack: () => navigate('library'), onChange: render });
}
function navigate(view, itemId = null) {
  State.view = view;
  State.itemId = itemId;
  history.replaceState({}, '', location.pathname);
  scrollTo(0, 0);
  render();
}
async function openItem(item, where) {
  const updated = {
    ...item,
    openedAt: Date.now(),
    state: item.state === 'inbox' ? 'reading' : item.state,
    updatedAt: Date.now(),
  };
  await store.put('items', updated);
  await journal.record('link-activity', updated, { actions: ['opened'] });
  navigate(where, updated.id);
}
async function finalizeExternalReadTracking() {
  await extRead.finalizePendingExternalRead((record) => journal.recordSession(record)).catch(() => {});
}
async function openOriginal(item) {
  // Finalize any still-open pending external read first — opening a second
  // link is a reasonable "I came back to Cove" signal for the first one.
  await finalizeExternalReadTracking();
  window.open(item.url, '_blank', 'noopener,noreferrer');
  extRead.writePendingExternal({ itemId: item.id, title: item.title || 'Untitled', startedAt: Date.now(), contentIncluded: journal.contentIncluded() });
  const updated = {
    ...item,
    openedAt: Date.now(),
    state: item.state === 'inbox' ? 'reading' : item.state,
    updatedAt: Date.now(),
  };
  await store.put('items', updated);
  journal.record('link-activity', updated, { actions: ['opened'] }).catch(() => {});
  State.itemId = updated.id;
  render();
}
function addDialog() {
  const url = el('input', {
      type: 'url',
      required: true,
      placeholder: 'https://example.com/article',
    }),
    title = el('input', { type: 'text', placeholder: 'Title (optional)' }),
    tags = el('input', { type: 'text', placeholder: 'finance, 공부' });
  const body = el('div', {}, [
    el('label', { class: 'field' }, [el('span', { text: 'URL' }), url]),
    el('label', { class: 'field' }, [el('span', { text: 'Title' }), title]),
    el('label', { class: 'field' }, [el('span', { text: 'Tags' }), tags]),
  ]);
  openModal(
    modalLayout('Add link', body, [
      el('button', { class: 'soft-btn', type: 'button', text: 'Cancel', onclick: closeModal }),
      el('button', {
        class: 'primary-btn',
        type: 'button',
        text: 'Save',
        onclick: async () => {
          const result = await addLink({ url: url.value, title: title.value, tags: tags.value });
          if (!result.ok) {
            toast(result.reason);
            return;
          }
          closeModal();
          State.tab = 'inbox';
          State.flashId = result.item.id;
          toast(result.duplicate ? 'Already in cove.' : 'Saved to cove.');
          await journal.record('link-saved', result.item);
          render();
        },
      }),
    ]),
  );
  setTimeout(() => url.focus(), 50);
}
function sortMenu() {
  const body = el(
    'div',
    { class: 'folder-list' },
    [
      ['added-desc', 'Newest first'],
      ['added-asc', 'Oldest first'],
      ['title', 'Title'],
      ['domain', 'Domain'],
    ].map(([v, l]) =>
      el('button', {
        class: `folder-option${State.sort === v ? ' active' : ''}`,
        type: 'button',
        text: l,
        onclick: () => {
          State.sort = v;
          localStorage.setItem('cove.sort', v);
          closeModal();
          render();
        },
      }),
    ),
  );
  openModal(
    modalLayout('Sort', body, [
      el('button', { class: 'soft-btn', type: 'button', text: 'Close', onclick: closeModal }),
    ]),
  );
}
async function itemMenu(item, action) {
  if (action === 'pin') {
    await store.put('items', { ...item, pinned: !item.pinned, updatedAt: Date.now() });
    toast(item.pinned ? 'Unpinned.' : 'Pinned.');
    render();
    return;
  }
  const folders = await store.all('folders');
  const body = el('div', { class: 'folder-list' }, [
    el('button', {
      class: 'folder-option',
      type: 'button',
      text: item.pinned ? 'Unpin' : 'Pin',
      onclick: async () => {
        closeModal();
        itemMenu(item, 'pin');
      },
    }),
    el('button', {
      class: 'folder-option',
      type: 'button',
      text: 'Move to folder…',
      onclick: () => {
        closeModal();
        folderPicker(folders, item.folderId || 'unsorted', async (id) => {
          await store.put('items', {
            ...item,
            folderId: id === 'unsorted' ? null : id,
            updatedAt: Date.now(),
          });
          render();
        });
      },
    }),
    el('button', {
      class: 'folder-option',
      type: 'button',
      text: 'Copy link',
      onclick: async () => {
        await navigator.clipboard.writeText(item.url);
        closeModal();
        toast('Link copied.');
      },
    }),
    el('button', {
      class: 'folder-option danger',
      type: 'button',
      text: 'Delete',
      onclick: async () => {
        closeModal();
        const article = await store.get('articles', item.id),
          notes = await store.annotationsFor(item.id);
        await store.deleteItemCascade(item.id);
        sync.markDeleted(item.urlKey);
        toast('Item deleted.', {
          action: {
            label: 'Undo',
            run: async () => {
              sync.unmarkDeleted(item.urlKey);
              await store.put('items', item);
              if (article) await store.put('articles', article);
              for (const n of notes) await store.put('annotations', n);
              toast('Item restored.');
              render();
            },
          },
        });
        if (State.view !== 'library') navigate('library');
        else render();
      },
    }),
  ]);
  openModal(
    modalLayout(item.title || item.host, body, [
      el('button', { class: 'soft-btn', type: 'button', text: 'Close', onclick: closeModal }),
    ]),
  );
}
function editTags(item) {
  const input = el('input', {
    type: 'text',
    value: item.tags.join(', '),
    placeholder: 'Up to 8 tags',
  });
  openModal(
    modalLayout(
      'Edit tags',
      el('label', { class: 'field' }, [el('span', { text: 'Comma or space separated' }), input]),
      [
        el('button', {
          class: 'primary-btn',
          type: 'button',
          text: 'Save',
          onclick: async () => {
            await store.put('items', {
              ...item,
              tags: normalizeTags(input.value),
              updatedAt: Date.now(),
            });
            closeModal();
            render();
          },
        }),
      ],
    ),
  );
}
async function init() {
  applyFontStep();
  await store.openDB();
  try {
    await navigator.storage?.persist?.();
  } catch {}
  const folders = await store.all('folders'),
    intake = await handleUrlIntake(folders);
  if (intake) {
    State.tab = 'inbox';
    if (intake.ok) {
      State.flashId = intake.item.id;
      toast(intake.duplicate ? 'Already in cove.' : 'Saved to cove.');
      if (intake.unknownFolder) toast('Folder not found. Saved to Unsorted.');
      if (!intake.duplicate) await sync.pushIntakeNow();
    } else toast(intake.reason);
  }
  if (localStorage.getItem('cove.autoTidy') === 'on') {
    const n = await autoTidy(6);
    if (n) toast(`${n} old item${n === 1 ? '' : 's'} tidied.`);
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  render();
  const syncRender = () => { if (State.view === 'library' || State.view === 'settings') render(); };
  sync.initAutoSync(syncRender);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { sync.resumeOnForeground(syncRender); void finalizeExternalReadTracking(); }
    else sync.pushOnBackground();
  });
  window.addEventListener('pagehide', () => sync.pushOnBackground());
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) sync.resumeOnForeground(syncRender);
    void finalizeExternalReadTracking();
  });
  window.addEventListener('focus', () => { void finalizeExternalReadTracking(); });
  // A pending external read also has to survive the app being fully closed
  // and relaunched later — recover (or discard, past the 60-minute cap) here.
  void finalizeExternalReadTracking();
}
document.querySelector('#brandButton').addEventListener('click', () => navigate('library'));
init();
