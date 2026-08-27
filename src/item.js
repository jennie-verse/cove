/* cove — item.js
   Detail-screen re-exports (the detail view itself lives in app.js renderDetail()).
*/

// Item detail rendering is composed in app.js; this module remains the stable
// extension point for future item-specific helpers without changing routes.
export const ITEM_STATES = Object.freeze(['inbox', 'reading', 'done']);
