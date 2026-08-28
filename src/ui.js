/* cove — ui.js
   Shared UI building blocks: element builder, icons, toast/undo, modal dialogs.
*/

export const $ = (selector, root = document) => root.querySelector(selector);
export const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function')
      node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== false && v != null)
      node.setAttribute(k, v === true && !k.startsWith('aria-') ? '' : String(v));
  }
  for (const child of [].concat(children))
    if (child != null) node.append(child.nodeType ? child : document.createTextNode(String(child)));
  return node;
};
export function icon(name) {
  const paths = {
    settings:
      '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6l-.1.1H10l-.1-.1a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1l-.1-.1V10l.1-.1a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06L7.06 4.1l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6l.1-.1h3.8l.1.1a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19.4 9c.1.4.3.75.6 1l.1.1v3.8l-.1.1c-.3.25-.5.6-.6 1Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    pin: '<path d="m9 4 6 0 1 7 3 3H5l3-3 1-7Z"/><path d="M12 14v7"/>',
    sort: '<path d="M8 7h11M8 12h8M8 17h5"/><path d="m3 5 2 2 2-2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v6H5V6h6"/>',
  };
  // SVG created with document.createElement() lives in the HTML namespace.
  // Safari then treats self-closing <path> tags as nested HTML elements and
  // renders an empty button. Create the icon in the SVG namespace instead.
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'ui-icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = paths[name] || paths.more;
  return svg;
}
export function toast(message, { action, timeout = 5000 } = {}) {
  const box = el('div', { class: 'toast' }, [el('span', { text: message })]);
  if (action) {
    const b = el('button', {
      type: 'button',
      text: action.label,
      onclick: () => {
        action.run();
        box.remove();
      },
    });
    box.append(b);
  }
  $('#toastRegion').append(box);
  setTimeout(() => box.remove(), timeout);
  return box;
}
export function openModal(content) {
  const modal = $('#modal'),
    body = $('#modalBody');
  body.replaceChildren(content);
  modal.showModal();
  return modal;
}
export function closeModal() {
  const modal = $('#modal');
  if (modal.open) modal.close();
}
export function modalLayout(title, body, actions = []) {
  return el('div', { class: 'modal-content' }, [
    el('h2', { text: title }),
    body,
    el('div', { class: 'modal-actions' }, actions),
  ]);
}
export function download(name, content, type = 'application/octet-stream') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
