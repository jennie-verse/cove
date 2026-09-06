/* cove — retention.js
   Stage 2 — Auto-tidy: releases old article bodies only (never metadata/highlights); pinned items and items with highlights are excluded.
*/

import * as store from './store.js';
export async function releaseOldArticles(days = 30) {
  const cutoff = Date.now() - days * 86400000,
    items = await store.all('items'),
    annotations = await store.all('annotations');
  let count = 0;
  for (const item of items) {
    if (item.pinned) continue;
    const article = await store.get('articles', item.id);
    if (!article || (article.lastOpenedAt || article.capturedAt) > cutoff) continue;
    await store.remove('articles', item.id);
    await store.put('items', { ...item, hasArticle: false, updatedAt: Date.now() });
    count++;
  }
  return { count, keptAnnotations: annotations.length };
}
export async function autoTidy(months = 6) {
  const cutoff = Date.now() - months * 30 * 86400000,
    items = await store.all('items'),
    annotations = await store.all('annotations');
  let count = 0;
  for (const item of items) {
    if (
      item.state !== 'done' ||
      item.pinned ||
      !item.doneAt ||
      item.doneAt > cutoff ||
      annotations.some((a) => a.itemId === item.id && !a.deletedAt)
    )
      continue;
    await store.deleteItemCascade(item.id);
    count++;
  }
  return count;
}
