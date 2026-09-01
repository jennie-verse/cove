/* cove — reader.js
   Stage 2 — Reader screen: renders saved article content in a sandboxed reader-host.html iframe, with font/size/theme controls and reading-progress persistence.
*/

import * as store from './store.js';
import { el, icon, toast, openModal, closeModal, modalLayout } from './ui.js';
import { addAnnotation, deleteAnnotation } from './annotation.js';
import * as journal from './journal.js';
import { createSessionTracker } from './activity-session.js';
const COLORS = [
  ['pink', '#f7c8d3'],
  ['yellow', '#f7e3a8'],
  ['green', '#cbe5b4'],
  ['blue', '#b9d8ee'],
  ['purple', '#cfc6e8'],
];
const readerSetting = (key, fallback) => localStorage.getItem(`cove.reader.${key}`) || fallback;
const readerVars = () => ({
  '--reader-size': `${readerSetting('size', '18')}px`,
  '--reader-line': readerSetting('line', '1.75'),
  '--reader-width': `${readerSetting('width', '620')}px`,
});

// The reader frame is sandboxed with `allow-scripts allow-popups
// allow-popups-to-escape-sandbox` and deliberately WITHOUT `allow-same-origin`
// (see reader-host.html / src/reader-frame.js). That makes it cross-origin
// from the app shell, so the two sides only ever talk over postMessage — the
// app never reaches into the frame's DOM, and the frame never reaches into
// the app's storage. We load it via `srcdoc` (fetched once) rather than
// `src="./reader-host.html"` because some embedding contexts block a
// sandboxed iframe whose `src` is a network URL; a `srcdoc` frame makes no
// network request at all and is unaffected.
let hostTemplatePromise;
function hostTemplate() {
  if (!hostTemplatePromise) hostTemplatePromise = fetch('./reader-host.html').then((r) => r.text());
  return hostTemplatePromise;
}

// Only one reader message listener should be live at a time; renderReader()
// can be called again (back/forward within the reader, highlight refresh)
// before the previous frame is gone.
let activeMessageHandler = null;
let activeReaderItem = null;
const readingSessions = createSessionTracker({
  kind: 'reading-session', itemType: 'article', storageKey: 'cove.journalSessions.v1',
  onRecord: (record) => journal.recordSession(record),
});
export function stopReaderSession() { activeReaderItem = null; readingSessions.clearItem(); }
document.addEventListener('visibilitychange', () => {
  if (document.hidden) readingSessions.stop();
  else if (activeReaderItem) readingSessions.start(activeReaderItem);
});
window.addEventListener('pagehide', () => readingSessions.stop());
function setMessageHandler(handler) {
  if (activeMessageHandler) window.removeEventListener('message', activeMessageHandler);
  activeMessageHandler = handler;
  if (handler) window.addEventListener('message', handler);
}

export async function renderReader(main, item, onBack, onMenu) {
  stopReaderSession();
  const article = await store.get('articles', item.id);
  if (!article) {
    toast('This saved article is no longer stored. Re-capture it to read again.');
    onBack();
    return;
  }
  await store.put('articles', { ...article, lastOpenedAt: Date.now() });
  main.className = 'reader-shell';
  const header = el('div', { class: 'reader-meta' }, [
    el('h1', { class: 'view-title', text: item.title || item.host }),
    el('div', {
      class: 'meta',
      text: `${item.host} · ${new Date(article.capturedAt).toLocaleDateString()} · ${article.wordCount.toLocaleString()} words`,
    }),
  ]);
  const iframe = el('iframe', {
    class: 'reader-frame',
    title: `Article: ${item.title || item.host}`,
    sandbox: 'allow-scripts allow-popups allow-popups-to-escape-sandbox',
    referrerpolicy: 'no-referrer',
  });
  const controls = el('div', { class: 'reader-controls' }, [
    el('button', { class: 'soft-btn', type: 'button', onclick: onBack }, [icon('back'), 'Back']),
    el('button', {
      class: 'outline-btn',
      type: 'button',
      text: 'Aa',
      onclick: () => readerSettings(iframe),
    }),
    el('button', { class: 'outline-btn', type: 'button', text: 'Export', onclick: onMenu }),
  ]);
  const sanitizedHtml = globalThis.DOMPurify
    ? DOMPurify.sanitize(article.html, {
        FORBID_TAGS: ['script', 'iframe', 'object', 'form', 'img', 'video', 'audio', 'style'],
      })
    : article.html;
  let notes = await store.annotationsFor(item.id);
  async function onDeleteAnnotation(id) {
    await deleteAnnotation(id);
    notes = notes.filter((n) => n.id !== id);
    iframe.contentWindow?.postMessage({ type: 'cove-unhighlight', id }, '*');
    currentAnnoSection = refreshAnnotations();
  }
  function refreshAnnotations() {
    const next = renderAnnotations(notes, onDeleteAnnotation);
    currentAnnoSection.replaceWith(next);
    return next;
  }
  let currentAnnoSection = renderAnnotations(notes, onDeleteAnnotation);

  const highlightToolbar = highlightBar(item, () => currentSelection, {
    onAdded(note) {
      notes = [...notes, note];
      iframe.contentWindow?.postMessage({ type: 'cove-highlight', ...note }, '*');
      iframe.contentWindow?.postMessage({ type: 'cove-clear-selection' }, '*');
      currentSelection = '';
      currentAnnoSection = refreshAnnotations();
    },
  });

  main.replaceChildren(
    header,
    controls,
    iframe,
    highlightToolbar,
    currentAnnoSection,
    el('div', { class: 'reader-progress' }),
  );

  let currentSelection = '';
  let progressTimer;
  setMessageHandler((event) => {
    if (event.source !== iframe.contentWindow) return;
    const msg = event.data || {};
    if (msg.type === 'cove-ready') {
      iframe.contentWindow.postMessage(
        {
          type: 'cove-render',
          html: sanitizedHtml,
          vars: readerVars(),
          highlights: notes.filter((n) => n.quote && !n.deletedAt),
          scrollTo: Math.max(0, Math.min(1, item.readProgress || 0)),
        },
        '*',
      );
      const contentIncluded = journal.contentIncluded();
      activeReaderItem = { id: item.id, title: contentIncluded ? (item.title || item.host || 'Untitled article') : 'Cove article', itemType: 'article', contentIncluded };
      readingSessions.start(activeReaderItem);
    } else if (msg.type === 'cove-selection') {
      currentSelection = msg.quote || '';
    } else if (msg.type === 'cove-scroll') {
      readingSessions.signal();
      const p = Math.max(0, Math.min(1, msg.progress || 0));
      document.documentElement.style.setProperty('--progress', `${p * 100}%`);
      clearTimeout(progressTimer);
      progressTimer = setTimeout(
        () =>
          store.put('items', {
            ...item,
            readProgress: p,
            openedAt: Date.now(),
            updatedAt: Date.now(),
          }),
        350,
      );
    } else if (msg.type === 'cove-activity') readingSessions.signal();
  });
  const template = await hostTemplate();
  iframe.srcdoc = template;
}

function highlightBar(item, getSelection, { onAdded }) {
  const bar = el('div', { class: 'highlight-toolbar', 'aria-label': 'Highlight selected text' });
  COLORS.forEach(([name]) =>
    bar.append(
      el('button', {
        class: `color-dot color-${name}`,
        type: 'button',
        title: `${name} highlight`,
        'aria-label': `${name} highlight`,
        onclick: async () => {
          const quote = getSelection();
          if (!quote) {
            toast('Select article text first.');
            return;
          }
          const note = prompt('Note (optional)') || '';
          const saved = await addAnnotation(item.id, {
            color: name,
            quote,
            note,
            locator: { prefix: '', suffix: '' },
          });
          toast('Highlight saved.');
          onAdded(saved);
        },
      }),
    ),
  );
  bar.append(
    el('button', {
      class: 'soft-btn',
      type: 'button',
      text: '+ Note',
      onclick: async () => {
        const note = prompt('Note');
        if (note) {
          const saved = await addAnnotation(item.id, { kind: 'note', note });
          toast('Note saved.');
          onAdded(saved);
        }
      },
    }),
  );
  return bar;
}
function renderAnnotations(notes, onDelete) {
  const section = el('section', { class: 'section' });
  section.append(el('h2', { text: `Highlights (${notes.filter((n) => !n.deletedAt).length})` }));
  const visible = notes.filter((n) => !n.deletedAt);
  if (!visible.length)
    section.append(
      el('p', { class: 'help', text: 'Select text above and choose a color, or add a note.' }),
    );
  visible.forEach((n) =>
    section.append(
      el('div', { class: 'annotation' }, [
        el('strong', { text: n.kind === 'note' ? 'Note' : `${n.color} highlight` }),
        n.quote ? el('blockquote', { text: n.quote }) : null,
        n.note ? el('p', { text: n.note }) : null,
        el('button', {
          class: 'mini-btn danger',
          type: 'button',
          text: 'Delete',
          onclick: () => onDelete(n.id),
        }),
      ]),
    ),
  );
  return section;
}
function readerSettings(iframe) {
  const size = el('input', {
    type: 'range',
    min: '14',
    max: '28',
    value: readerSetting('size', '18'),
  });
  const line = el('input', {
    type: 'range',
    min: '1.3',
    max: '2.2',
    step: '.05',
    value: readerSetting('line', '1.75'),
  });
  const width = el('input', {
    type: 'range',
    min: '420',
    max: '760',
    step: '20',
    value: readerSetting('width', '620'),
  });
  const body = el('div', {}, [
    el('label', { class: 'field' }, [el('span', { text: 'Text size' }), size]),
    el('label', { class: 'field' }, [el('span', { text: 'Line height' }), line]),
    el('label', { class: 'field' }, [el('span', { text: 'Reading width' }), width]),
  ]);
  openModal(
    modalLayout('Reading appearance', body, [
      el('button', {
        class: 'primary-btn',
        type: 'button',
        text: 'Save',
        onclick: () => {
          localStorage.setItem('cove.reader.size', size.value);
          localStorage.setItem('cove.reader.line', line.value);
          localStorage.setItem('cove.reader.width', width.value);
          iframe.contentWindow?.postMessage({ type: 'cove-vars', vars: readerVars() }, '*');
          closeModal();
        },
      }),
    ]),
  );
}
