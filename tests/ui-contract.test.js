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
  const cacheBuild = sw.match(/cove-v(\d+)-ui-icons-layout/)?.[1];

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
