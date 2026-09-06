/* cove — library.js
   Library list: search, sort, and folder/status filtering over items.
*/

import * as store from './store.js';
import { el, icon } from './ui.js';
const relTime = (value) => {
  const days = Math.max(0, Math.floor((Date.now() - value) / 86400000));
  return days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
};
export async function libraryData({
  tab = 'inbox',
  folderId = 'all',
  query = '',
  sort = 'added-desc',
} = {}) {
  const [items, folders, articles] = await Promise.all([
    store.all('items'),
    store.all('folders'),
    store.all('articles'),
  ]);
  const folderMap = new Map(folders.map((f) => [f.id, f]));
  const articleMap = new Map(articles.map((a) => [a.itemId, a]));
  let rows = items.filter(
    (i) =>
      i.state === tab &&
      (folderId === 'all' || (folderId === 'unsorted' ? !i.folderId : i.folderId === folderId)),
  );
  const q = query.trim().toLocaleLowerCase();
  if (q) {
    if (q.startsWith('#')) rows = rows.filter((i) => i.tags.includes(q.slice(1)));
    else
      rows = rows.filter((i) =>
        [
          i.title,
          i.url,
          i.note,
          ...i.tags,
          folderMap.get(i.folderId)?.name,
          articleMap.get(i.id)?.text,
        ].some((v) =>
          String(v || '')
            .toLocaleLowerCase()
            .includes(q),
        ),
      );
  }
  const sorters = {
    'added-desc': (a, b) => b.addedAt - a.addedAt,
    'added-asc': (a, b) => a.addedAt - b.addedAt,
    title: (a, b) => a.title.localeCompare(b.title),
    domain: (a, b) => a.host.localeCompare(b.host),
  };
  rows.sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || (sorters[sort] || sorters['added-desc'])(a, b),
  );
  return { rows, items, folders, articleMap };
}
export function renderCard(item, article, { onOpen, onMenu }) {
  const card = el('div', {
    class: `item-card${item.pinned ? ' pinned' : ''}`,
    role: 'button',
    tabindex: '0',
    onclick: () => onOpen(item.id),
    onkeydown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onOpen(item.id);
      }
    },
    'aria-label': `${item.title || item.host}, ${item.state}`,
  });
  const badge = el('span', { class: 'domain-badge', text: (item.host || '?')[0].toUpperCase() });
  const info = el('span');
  info.append(
    el('span', { class: 'card-title', text: item.title || item.host }),
    el('span', {
      class: 'card-meta',
      text: `${item.host}${article ? ` · ${Math.max(1, Math.ceil(article.wordCount / 220))} min` : ''} · ${relTime(item.addedAt)}`,
    }),
  );
  if (item.tags.length)
    info.append(
      el(
        'span',
        { class: 'tags' },
        item.tags.map((tag) => el('span', { class: 'tag', text: `#${tag}` })),
      ),
    );
  const actions = el('span', { class: 'card-actions' }, [
    el(
      'button',
      {
        class: 'mini-btn',
        type: 'button',
        'aria-label': item.pinned ? 'Unpin' : 'Pin',
        onclick: (e) => {
          e.stopPropagation();
          onMenu(item, 'pin');
        },
      },
      [icon('pin')],
    ),
    el(
      'button',
      {
        class: 'mini-btn',
        type: 'button',
        'aria-label': 'Item menu',
        onclick: (e) => {
          e.stopPropagation();
          onMenu(item, 'menu');
        },
      },
      [icon('more')],
    ),
  ]);
  card.append(badge, info, actions);
  return card;
}
export function counts(items) {
  return {
    inbox: items.filter((i) => i.state === 'inbox').length,
    reading: items.filter((i) => i.state === 'reading').length,
    done: items.filter((i) => i.state === 'done').length,
  };
}
