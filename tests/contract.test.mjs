import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { Context } from '@deepseek-ai/cordis';
const require = createRequire(import.meta.url);

test('built session binding reaches native sibling through rc.2 display:contents slot wrapper', async () => {
  const dom = new JSDOM('<div id="root"></div>', { pretendToBeVisual: true, url: 'http://localhost' });
  const previous = { window: globalThis.window, document: globalThis.document };
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  const React = require('react'), { createRoot } = require('react-dom/client'), { flushSync } = require('react-dom');
  const root = createRoot(dom.window.document.querySelector('#root'));
  const effects = [], entries = new Map();
  try {
    const plugin = factory('dist/client.js').factory(require);
    const directory = { getSnapshot: () => ({ current: { provider: 'test', model: 'deepseek-v4.1-flash' }, groups: [] }), subscribe: () => () => {} };
    plugin.apply({
      effect(fn) { const stop = fn(); if (stop) effects.push(stop); },
      modelDirectories: { directoryFor: () => ({ store: directory }) },
      slots: { inject(_name, fn) { fn(); }, register(options, component) { entries.set(options.name, { options, component }); return () => {}; } },
    });
    const binding = entries.get('conversation.input.right');
    flushSync(() => root.render(React.createElement('div', { className: 'rc2_standardControls' },
      React.createElement('div', { 'data-slot': 'conversation.input.right', style: { display: 'contents' } }, React.createElement(binding.component, binding.options.inject('a'))),
      React.createElement('div', { 'data-slot': 'conversation.input.model' }, React.createElement('button', { 'aria-haspopup': 'menu', 'aria-busy': false }, React.createElement('span', { className: 'rc2_triggerLabel' }, '我的主力'))))));
    assert.match(dom.window.document.querySelector('.dtb-caption')?.textContent ?? '', /^DS4.1F/);
    flushSync(() => root.unmount());
    assert.equal(dom.window.document.querySelector('.dtb-caption'), null);
  } finally {
    for (const stop of effects.reverse()) stop();
    globalThis.window = previous.window; globalThis.document = previous.document; dom.window.close();
  }
});

function factory(path) {
  let registration;
  globalThis.window.__ModuleLoader__ = { load(value) { registration = value; } };
  vm.runInNewContext(readFileSync(path, 'utf8'), { window: globalThis.window, console, document: globalThis.document, URL, TextEncoder, TextDecoder, AbortController, fetch, setInterval, clearInterval, setTimeout, clearTimeout });
  assert.equal(typeof registration.factory, 'function');
  return registration;
}

test('built artifact mounts in real rc.2 Cordis/SlotRegistry, follows slot lifetimes and cleans up', async () => {
  const dom = new JSDOM('<body></body>', { pretendToBeVisual: true, url: 'http://localhost' });
  const oldDoc = globalThis.document, oldWin = globalThis.window;
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  const styles = () => [...dom.window.document.querySelectorAll('style[data-plugin="dsh-peakclock"]')];
  let rootOwner;
  try {
    const rendererRegistration = factory(require.resolve('@deepseek-ai/dsh-client-ui-renderer/client'));
    const { SlotRegistry } = rendererRegistration.factory(require);
    const registration = factory('dist/client.js');
    assert.equal(registration.id, 'dsh-peakclock');
    const requests = [];
    const plugin = registration.factory(id => { requests.push(id); return require(id); });
    assert.ok(requests.every(id => ['react', 'react-dom', 'react/jsx-runtime'].includes(id)));
    const root = new Context();
    let ctx;
    rootOwner = root.plugin(owned => { ctx = owned; });
    await rootOwner.await();
    await ctx.plugin(SlotRegistry).await();
    let dictionaries = 0;
    ctx.provide('locale', { register() { dictionaries++; return () => { dictionaries--; }; } });
    ctx.provide('modelDirectories', { directoryFor() { return { store: { getSnapshot: () => ({ current: null, groups: [] }), subscribe: () => () => {} } }; } });
    const mounted = ctx.plugin(plugin);
    await mounted.await();
    assert.equal(styles().length, 1);
    assert.equal(dictionaries, 0);
    assert.equal(ctx.get('slots').entries('plugins.bundle.config').length, 0);
    const declare = () => ctx.get('slots').register({ name: 'root', children: { 'plugins.bundle.config': { kind: 'keyed', scope: 'root' } } }, () => null);
    const remove = declare();
    assert.equal(ctx.get('slots').entries('plugins.bundle.config').length, 1);
    assert.equal(ctx.get('slots').entries('plugins.bundle.config')[0].options.key, 'dsh-peakclock');
    remove();
    assert.equal(ctx.get('slots').entries('plugins.bundle.config').length, 0);
    const removeAgain = declare();
    assert.equal(ctx.get('slots').entries('plugins.bundle.config').length, 1);
    await mounted.dispose();
    assert.equal(ctx.get('slots').entries('plugins.bundle.config').length, 0);
    assert.equal(styles().length, 0);
    assert.equal(dictionaries, 0);
    removeAgain();
  } finally {
    if (rootOwner) await rootOwner.dispose();
    globalThis.document = oldDoc; globalThis.window = oldWin; dom.window.close();
  }
});
