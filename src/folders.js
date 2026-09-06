/* cove — folders.js
   Folder management — add/rename/reorder/delete. Deleting a folder moves its items to Unsorted; items are never deleted.
*/

import * as store from './store.js';
import { el, openModal, closeModal, modalLayout, toast } from './ui.js';
import { exportItemsMarkdown } from './annotation.js';
export async function createFolder(name) {
  const trimmed = String(name || '')
    .trim()
    .slice(0, 40);
  if (!trimmed) throw new Error('Enter a folder name.');
  const folders = await store.all('folders');
  if (folders.some((f) => f.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase()))
    throw new Error('That folder already exists.');
  const row = {
    id: store.makeId('f'),
    name: trimmed,
    order: folders.length,
    createdAt: Date.now(),
  };
  await store.put('folders', row);
  return row;
}
export async function deleteFolder(id) {
  const items = await store.all('items');
  for (const item of items.filter((i) => i.folderId === id))
    await store.put('items', { ...item, folderId: null, updatedAt: Date.now() });
  await store.remove('folders', id);
}
export async function renameFolder(id, name) {
  const trimmed = String(name || '')
    .trim()
    .slice(0, 40);
  if (!trimmed) throw new Error('Enter a folder name.');
  const folders = await store.all('folders');
  if (
    folders.some(
      (f) => f.id !== id && f.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
    )
  )
    throw new Error('That folder already exists.');
  const folder = await store.get('folders', id);
  if (!folder) return;
  await store.put('folders', { ...folder, name: trimmed });
}
export async function moveFolder(id, direction) {
  const folders = (await store.all('folders')).sort((a, b) => a.order - b.order);
  const index = folders.findIndex((f) => f.id === id);
  const swapWith = index + direction;
  if (index < 0 || swapWith < 0 || swapWith >= folders.length) return;
  const a = folders[index],
    b = folders[swapWith];
  await store.put('folders', { ...a, order: b.order });
  await store.put('folders', { ...b, order: a.order });
}
export function folderPicker(folders, current, onPick, { manage } = {}) {
  const list = el('div', { class: 'folder-list' });
  const rows = [
    { id: 'all', name: 'All folders' },
    { id: 'unsorted', name: 'Unsorted' },
    ...folders.sort((a, b) => a.order - b.order),
  ];
  rows.forEach((f) =>
    list.append(
      el(
        'button',
        {
          type: 'button',
          class: `folder-option${current === f.id ? ' active' : ''}`,
          onclick: () => {
            closeModal();
            onPick(f.id);
          },
        },
        [el('span', { text: f.name })],
      ),
    ),
  );
  if (manage)
    list.append(
      el(
        'button',
        {
          type: 'button',
          class: 'folder-option',
          onclick: () => {
            closeModal();
            manage();
          },
        },
        [el('strong', { text: 'Manage folders' })],
      ),
    );
  openModal(
    modalLayout('Folders', list, [
      el('button', { class: 'soft-btn', type: 'button', text: 'Close', onclick: closeModal }),
    ]),
  );
}
export async function manageFolders(onChange) {
  const paint = async () => {
    const folders = (await store.all('folders')).sort((a, b) => a.order - b.order),
      items = await store.all('items');
    const list = el('div', { class: 'folder-list' });
    list.append(
      el(
        'button',
        {
          class: 'folder-option',
          type: 'button',
          onclick: async () => {
            const name = prompt('Folder name');
            if (name)
              try {
                await createFolder(name);
                toast('Folder created.');
                paint();
              } catch (e) {
                toast(e.message);
              }
          },
        },
        [el('strong', { text: '+ New folder' })],
      ),
    );
    folders.forEach((f, index) => {
      const count = items.filter((i) => i.folderId === f.id).length;
      list.append(
        el('div', { class: 'row' }, [
          el('button', {
            class: 'row-label soft-btn',
            type: 'button',
            text: f.name,
            'aria-label': `Rename ${f.name}`,
            onclick: async () => {
              const name = prompt('Rename folder', f.name);
              if (name == null) return;
              try {
                await renameFolder(f.id, name);
                onChange?.();
                paint();
              } catch (e) {
                toast(e.message);
              }
            },
          }),
          el('span', { class: 'row-value', text: `${count} item${count === 1 ? '' : 's'}` }),
          el('div', { class: 'card-actions' }, [
            el('button', {
              class: 'mini-btn',
              type: 'button',
              text: 'Export',
              'aria-label': `Export ${f.name} as Markdown`,
              onclick: () =>
                exportItemsMarkdown(
                  items.filter((i) => i.folderId === f.id),
                  () => f.name,
                  `${f.name.replace(/[\\/:*?"<>|]/g, '-')}--cove-notes`,
                ),
            }),
            el('button', {
              class: 'mini-btn',
              type: 'button',
              text: '↑',
              'aria-label': `Move ${f.name} up`,
              disabled: index === 0,
              onclick: async () => {
                await moveFolder(f.id, -1);
                paint();
              },
            }),
            el('button', {
              class: 'mini-btn',
              type: 'button',
              text: '↓',
              'aria-label': `Move ${f.name} down`,
              disabled: index === folders.length - 1,
              onclick: async () => {
                await moveFolder(f.id, 1);
                paint();
              },
            }),
            el('button', {
              class: 'mini-btn danger',
              type: 'button',
              text: 'Delete',
              onclick: async () => {
                if (confirm(`${count} items will move to Unsorted. Items are not deleted.`)) {
                  await deleteFolder(f.id);
                  toast('Folder deleted.');
                  onChange?.();
                  paint();
                }
              },
            }),
          ]),
        ]),
      );
    });
    openModal(
      modalLayout('Manage folders', list, [
        el('button', { class: 'soft-btn', type: 'button', text: 'Close', onclick: closeModal }),
      ]),
    );
  };
  paint();
}
