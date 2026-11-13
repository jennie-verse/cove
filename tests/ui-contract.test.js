import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('dynamic icons are created in the SVG namespace', async () => {
  const source = await read('src/ui.js');
  assert.match(source, /createElementNS\('http:\/\/www\.w3\.org\/2000\/svg', 'svg'\)/);
  assert.doesNotMatch(source, /const svg = el\('svg'/);
});

test('entry asset build stamps and service worker cache stay aligned', async () => {
  const [html, sw] = await Promise.all([read('index.html'), read('sw.js')]);
  const cssBuild = html.match(/app\.css\?v=(\d+)/)?.[1];
  const appBuild = html.match(/app\.js\?v=(\d+)/)?.[1];
  const cacheBuild = sw.match(/cove-v(\d+)-[\w-]+/)?.[1];

  assert.ok(cssBuild, 'CSS build stamp is missing');
  assert.equal(appBuild, cssBuild);
  assert.equal(cacheBuild, cssBuild);
  assert.match(sw, new RegExp(`app\\.css\\?v=${cssBuild}`));
  assert.match(sw, new RegExp(`app\\.js\\?v=${cssBuild}`));
});

test('responsive layout keeps rows full-width and controls touch-friendly', async () => {
  const css = await read('assets/app.css');
  assert.match(css, /\.row\{width:100%/);
  assert.match(css, /\.mini-btn\{min-width:44px\}/);
  assert.match(css, /\.tags button\.tag\{min-width:44px\}/);
  assert.match(css, /\.highlight-toolbar\{flex-wrap:wrap/);
  assert.match(css, /\.library-shell \.topbar,main\.library-view/);
});

test('foldable and Mac layout rules exist and the build stamp matches everywhere', async () => {
  const [css, sw, version, frame] = await Promise.all([
    read('assets/app.css'), read('sw.js'), read('src/version.js'), read('src/reader-frame.js'),
  ]);
  assert.match(css, /overscroll-behavior:none/);
  assert.match(css, /touch-action:manipulation/);
  assert.ok(css.includes('@media (min-width: 640px) and (min-height: 560px){.settings-view{max-width:760px'));
  assert.match(css, /@media\(min-width:800px\)\{\.app-shell\{width:min\(100%,1040px\)/);
  assert.match(css, /@media\(max-width:400px\)/);
  assert.match(css, /@media\(hover:hover\) and \(pointer:fine\)/);
  const build = version.match(/APP_BUILD = "([^"]+)"/)?.[1];
  assert.equal(build, '2026.11.12-foldable4');
  assert.ok(sw.includes(`cove-v1-${build}`));
  assert.match(frame, /addEventListener\('resize'/);
});

test('reader frame styles load from a file allowed by the inherited app CSP', async () => {
  const [host, css, sw, index] = await Promise.all([
    read('reader-host.html'), read('src/reader-host.css'), read('sw.js'), read('index.html'),
  ]);
  // srcdoc frames inherit index.html's style-src 'self', which blocks inline <style>.
  assert.match(index, /style-src 'self'/);
  assert.doesNotMatch(host, /<style[\s>]/);
  assert.match(host, /<link rel="stylesheet" href="\.\/src\/reader-host\.css"/);
  assert.match(host, /style-src 'self'/);
  assert.doesNotMatch(host, /unsafe-inline/);
  assert.match(css, /var\(--reader-size/);
  assert.match(css, /mark\[data-color='pink'\]/);
  assert.ok(sw.includes("'./src/reader-host.css'"));
});

test('centered dialogs and the highlight bar respect the safe-area insets', async () => {
  const [css, frame] = await Promise.all([read('assets/app.css'), read('src/reader-frame.js')]);
  // Tier A centered dialog must stay below the top inset and above the bottom one.
  assert.ok(css.includes('calc(100dvh - 2*max(env(safe-area-inset-top),env(safe-area-inset-bottom)) - 24px)'));
  // Below tier A the same cap applies (equals the UA default at zero inset).
  assert.ok(css.includes('.modal{max-height:calc(100dvh - 2*max(env(safe-area-inset-top),env(safe-area-inset-bottom)) - 30px)}'));
  // Sticky 44px highlight controls must not sit in the home-indicator zone.
  assert.match(css, /\.highlight-toolbar\{bottom:calc\(12px \+ env\(safe-area-inset-bottom\)\)\}/);
  // A user scroll right after a resize cancels the pending position restore.
  assert.match(frame, /addEventListener\('wheel', cancelRestore/);
  assert.match(frame, /addEventListener\('touchstart', cancelRestore/);
});
