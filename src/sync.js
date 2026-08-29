/* cove — sync.js
   Cross-device sync via shared/v1/sync.js against the shared private
   webapp-data repository (same repo Tide and other apps use, cove/ folder
   only). Off by default. Mirrors Tide's Settings sync section: token
   save/clear, device/app context name, a Sync toggle, a manual "Sync now"
   (pullAndMerge → pushNow), and an automatic pullAndMerge on app load.

   Safari and the Home Screen app are separate storage contexts even on the
   same iPhone — each gets its own contextId and its own remote file, merged
   together on read. Article bodies are never uploaded, only metadata.
*/
import * as store from './store.js';

const SYNC = {
  namespace: 'cove',
  repo: 'webapp-data',
  branch: 'main',
  dirPath: 'cove',
  basePath: 'cove/data.json',
  enabledKey: 'cove.syncEnabled',
  tokenKey: 'cove.syncToken.v1',
  lastSyncKey: 'cove.lastSyncAt',
};

let lastError = null;

function read(key) {
  try { return localStorage.getItem(key) || ''; } catch { return ''; }
}
function write(key, value) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch { /* ignore */ }
}

export const isEnabled = () => read(SYNC.enabledKey) === '1';
export const getToken = () => read(SYNC.tokenKey);
export const tokenHint = () => (getToken() ? `Saved · ends in ${getToken().slice(-4)}` : 'No token saved');
export const getLastSync = () => Number(read(SYNC.lastSyncKey) || 0);
export const getLastError = () => lastError;
export const getContext = () => read(`${SYNC.namespace}.syncContextId`);
export const getContextLabel = () => read(`${SYNC.namespace}.syncContextLabel`);

async function shared() {
  return import('../../shared/v1/sync.js');
}

function pagesOwner() {
  const match = /^([a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?)\.github\.io$/i.exec(location.hostname);
  if (match) return match[1];
  const e = new Error('Cannot determine the GitHub account from this deployment. Sync is disabled on custom domains.');
  e.type = 'configuration';
  throw e;
}
function cfg() {
  return { owner: pagesOwner(), repo: SYNC.repo, branch: SYNC.branch, token: getToken() };
}

export function setToken(value) {
  write(SYNC.tokenKey, String(value || '').trim());
}
export function clearToken() {
  write(SYNC.tokenKey, '');
  write(SYNC.enabledKey, '0');
}

export async function ensureContext(label) {
  const mod = await shared();
  const id = await mod.ensureContextId(SYNC.namespace, () => label || '');
  if (label) mod.setContextLabel(SYNC.namespace, label);
  return id;
}

export async function enable(label) {
  if (!getToken()) throw new Error('Save a token first.');
  const id = await ensureContext(label);
  if (!id) throw new Error('Could not identify this device/app.');
  write(SYNC.enabledKey, '1');
}
export function disable() {
  write(SYNC.enabledKey, '0');
}

function describeError(e) {
  if (!e) return 'Unknown error';
  if (e.type === 'auth') return 'The token is invalid or expired.';
  if (e.type === 'network') return 'A network error stopped the request.';
  if (e.type === 'notfound') return 'The repository was not found. Check the name.';
  if (e.type === 'conflict') return 'A conflict happened and retrying failed.';
  if (e.type === 'configuration') return e.message;
  return e.message || 'Unknown error';
}

function stripArticle(item) {
  const { hasArticle, ...rest } = item;
  return { ...rest, hasArticle: false };
}

async function snapshot() {
  return {
    app: 'cove',
    schema: 1,
    updatedAt: new Date().toISOString(),
    folders: await store.all('folders'),
    items: (await store.all('items')).map(stripArticle),
    annotations: await store.all('annotations'),
  };
}

async function mergeIn(data) {
  for (const f of data.folders || []) await store.put('folders', f);
  for (const i of data.items || []) {
    const current = await store.getByUrlKey(i.urlKey);
    await store.put(
      'items',
      current
        ? { ...i, ...current, tags: [...new Set([...(i.tags || []), ...(current.tags || [])])] }
        : i,
    );
  }
  for (const a of data.annotations || []) {
    const current = await store.get('annotations', a.id);
    if (!current || (a.updatedAt || 0) >= (current.updatedAt || 0)) await store.put('annotations', a);
  }
}

let pullInFlight = null;

/** Pull every context's remote file and merge into local storage. */
export function pullAndMerge() {
  if (pullInFlight) return pullInFlight;
  pullInFlight = doPull().finally(() => { pullInFlight = null; });
  return pullInFlight;
}

async function doPull() {
  if (!isEnabled()) return;
  if (!getToken()) { lastError = 'No token — could not sync.'; return; }
  const contextId = getContext();
  if (!contextId) return;
  try {
    const mod = await shared();
    const config = cfg();
    const dir = await mod.listDir(config, SYNC.dirPath);
    const files = dir.filter((f) => f.type === 'file' && /^data\..+\.json$/.test(f.name));
    for (const f of files) {
      const res = await mod.readFile(config, f.path);
      if (res && res.exists && res.content) {
        try { await mergeIn(JSON.parse(res.content)); } catch { /* skip corrupt file */ }
      }
    }
    lastError = null;
    write(SYNC.lastSyncKey, String(Date.now()));
  } catch (e) {
    lastError = describeError(e);
  }
}

let pushInFlight = null;

/** Push this context's current snapshot to its own remote file. */
export function pushNow() {
  if (pushInFlight) return pushInFlight;
  pushInFlight = doPush().finally(() => { pushInFlight = null; });
  return pushInFlight;
}

async function doPush() {
  if (!isEnabled()) return;
  if (!getToken()) { lastError = 'No token — could not send.'; return; }
  const contextId = getContext();
  if (!contextId) return;
  try {
    const mod = await shared();
    const config = cfg();
    const path = await mod.contextFilePath(SYNC.basePath, contextId);
    const payload = JSON.stringify(await snapshot(), null, 2);
    const remote = await mod.readFile(config, path);
    await mod.writeFile(config, path, payload, {
      sha: remote.sha || undefined,
      message: `sync: cove ${new Date().toISOString().slice(0, 16)}`,
    });
    lastError = null;
    write(SYNC.lastSyncKey, String(Date.now()));
  } catch (e) {
    lastError = describeError(e);
  }
}

/** Manual "Sync now" — pull first so a push never clobbers a fresher remote item, then push. */
export async function syncNow() {
  await pullAndMerge();
  await pushNow();
  if (lastError) throw new Error(lastError);
  return (await store.all('items')).length;
}

/** Called once at app boot. Fire-and-forget: never blocks the first render. */
export async function initAutoSync(onMerged) {
  if (!isEnabled() || !getToken() || !getContext()) return;
  await pullAndMerge();
  if (onMerged) onMerged();
}

/* iOS Home Screen apps are usually suspended in place rather than reloaded when
   backgrounded, so initAutoSync's one-shot boot pull only ever ran once at
   install/first open — reopening the icon later showed stale data even though
   Safari (which reloads more readily) looked fine. resumeOnForeground() re-pulls
   every time the app is actually shown again, and pushOnBackground() pushes local
   changes out before it's hidden, so two contexts stay in sync without a manual
   "Sync now" tap in the common case. */

/** Called when the app becomes visible again (Home Screen resume, tab refocus, bfcache restore). */
export async function resumeOnForeground(onMerged) {
  if (!isEnabled() || !getToken() || !getContext()) return;
  await pullAndMerge();
  if (onMerged) onMerged();
}

/** Called when the app is about to background/close — push local changes so the next resume elsewhere sees them. */
export function pushOnBackground() {
  if (!isEnabled() || !getToken() || !getContext()) return;
  pushNow();
}
