import test from 'node:test';import assert from 'node:assert/strict';import {normalizeUrlKey,parseHttpUrl,normalizeTags} from '../src/url.js';
test('tracking parameters, www, fragment and trailing slash normalize',()=>{assert.equal(normalizeUrlKey('https://www.Example.com/Story/?utm_source=x&fbclid=y#part'),'https://example.com/Story')});
test('path case is preserved and query is sorted',()=>{assert.equal(normalizeUrlKey('https://EXAMPLE.com/A?b=2&a=1'),'https://example.com/A?a=1&b=2')});
test('unsafe protocols are rejected',()=>{assert.equal(parseHttpUrl('javascript:alert(1)'),null);assert.equal(parseHttpUrl('data:text/html,x'),null)});
test('tags normalize and cap at eight',()=>{assert.deepEqual(normalizeTags('#공부 Finance finance'),['공부','finance'])});
