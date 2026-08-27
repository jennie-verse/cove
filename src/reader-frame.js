/* cove — reader-frame.js
   Trusted bootstrap script that runs INSIDE reader-host.html, the sandboxed
   iframe (sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox",
   deliberately WITHOUT allow-same-origin) that renders saved article bodies.

   This script is the only script cove ever loads into that frame. Article
   HTML itself is data, never executed: it arrives already sanitized by
   DOMPurify in src/reader.js and is only ever assigned via innerHTML into
   the #content container below. Because the frame has no allow-same-origin
   token, it is cross-origin from the app shell — even if something slipped
   past sanitization, it cannot reach localStorage, IndexedDB, cookies, or
   the parent DOM. All communication with the app shell happens over
   postMessage, which works across that origin boundary by design.
*/
(() => {
  const content = document.getElementById('content');

  function applyVars(vars) {
    for (const [key, value] of Object.entries(vars || {})) {
      document.documentElement.style.setProperty(key, value);
    }
  }

  function hardenLinks() {
    content.querySelectorAll('a[href]').forEach((a) => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
  }

  // Same text-offset quote locator as src/annotation.js locateQuote() —
  // duplicated here because this frame cannot import app modules (no
  // same-origin access to fetch/import them under this sandbox).
  function locateQuote(root, quote) {
    if (!quote) return null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node,
      text = '',
      nodes = [];
    while ((node = walker.nextNode())) {
      nodes.push({ node, start: text.length, end: text.length + node.data.length });
      text += node.data;
    }
    const start = text.indexOf(quote);
    if (start < 0) return null;
    const end = start + quote.length,
      s = nodes.find((n) => n.start <= start && n.end > start),
      e = nodes.find((n) => n.start < end && n.end >= end);
    if (!s || !e) return null;
    const range = document.createRange();
    range.setStart(s.node, start - s.start);
    range.setEnd(e.node, end - e.start);
    return range;
  }

  function applyHighlight({ id, color, quote, note }) {
    if (!quote) return;
    const range = locateQuote(content, quote);
    if (!range || range.collapsed) return;
    const mark = document.createElement('mark');
    mark.dataset.annotation = id;
    mark.dataset.color = color;
    mark.title = note || `${color} highlight`;
    try {
      range.surroundContents(mark);
    } catch {
      /* overlapping ranges etc. — leave unhighlighted rather than break rendering */
    }
  }

  function removeHighlight(id) {
    const mark = content.querySelector(`mark[data-annotation="${CSS.escape(id)}"]`);
    if (mark) mark.replaceWith(...mark.childNodes);
  }

  function render(data) {
    content.innerHTML = data.html || '';
    applyVars(data.vars);
    hardenLinks();
    (data.highlights || []).forEach(applyHighlight);
    if (typeof data.scrollTo === 'number') {
      requestAnimationFrame(() => {
        scrollTo({
          top: data.scrollTo * Math.max(0, document.documentElement.scrollHeight - innerHeight),
          behavior: 'instant',
        });
      });
    }
  }

  window.addEventListener('message', (event) => {
    if (event.source !== parent) return;
    const msg = event.data || {};
    if (msg.type === 'cove-render') render(msg);
    else if (msg.type === 'cove-vars') applyVars(msg.vars);
    else if (msg.type === 'cove-highlight') applyHighlight(msg);
    else if (msg.type === 'cove-unhighlight') removeHighlight(msg.id);
    else if (msg.type === 'cove-clear-selection') getSelection()?.removeAllRanges();
  });

  let selectionTimer;
  document.addEventListener('selectionchange', () => {
    clearTimeout(selectionTimer);
    selectionTimer = setTimeout(() => {
      const sel = getSelection();
      const quote = sel && !sel.isCollapsed ? sel.toString().trim() : '';
      if (quote && sel.anchorNode && content.contains(sel.anchorNode)) {
        parent.postMessage({ type: 'cove-selection', quote }, '*');
      }
    }, 120);
  });

  let scrollTimer;
  addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      parent.postMessage({ type: 'cove-scroll', progress: scrollY / max }, '*');
    }, 200);
  });

  parent.postMessage({ type: 'cove-ready' }, '*');
})();
