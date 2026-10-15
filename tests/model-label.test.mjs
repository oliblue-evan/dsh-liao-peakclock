import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mountModelLabels } from '../src/model-label.ts';
import { createPreferences } from '../src/preferences.ts';
import { createCalendarStore } from '../src/calendar-store.ts';
const settle = win => new Promise(resolve => win.setTimeout(resolve, 45));
test('native trigger keeps behavior and React-owned nodes across changes, settings, remount and cleanup', async () => {
  const dom = new JSDOM('<button aria-haspopup="menu" aria-busy="false" aria-label="original"><span class="cl2Rlq_triggerLabel">Deepseek-V4.1-Flash · x0.11</span><span class="cl2Rlq_triggerEffort">High</span></button>', { pretendToBeVisual: true, url: 'http://localhost' });
  const doc = dom.window.document, button = doc.querySelector('button'), label = doc.querySelector('span'), text = label.firstChild;
  const prefs = createPreferences(() => dom.window.localStorage);
  const calendar = createCalendarStore(() => dom.window.localStorage);
  let now = Date.parse('2026-10-15T09:30:00+08:00'), tick;
  const clock = { getSnapshot: () => now, subscribe(fn) { tick = fn; return () => { tick = null; }; } };
  let clicks = 0; button.addEventListener('click', () => clicks++);
  const stop = mountModelLabels({ document: doc, preferences: prefs, calendar, clock });
  assert.equal(doc.querySelector('.dtb-caption').textContent, 'DS4.1F · 峰 2:30');
  assert.equal(label.firstChild, text); assert.equal(text.data, 'Deepseek-V4.1-Flash · x0.11');
  assert.match(doc.querySelector('.dtb-caption').title, /x0.11/);
  button.click(); assert.equal(clicks, 1); assert.equal(button.getAttribute('aria-label'), 'original');
  now = Date.parse('2026-10-15T12:00:00+08:00'); tick(); await settle(dom.window);
  assert.match(doc.querySelector('.dtb-caption').textContent, /谷 2:00/);
  text.data = 'gpt-6.1-sol'; await settle(dom.window);
  assert.equal(doc.querySelector('.dtb-caption'), null); assert.equal(label.hasAttribute('data-dtb-original'), false);
  text.data = 'DeepSeek-V4-Pro'; await settle(dom.window);
  assert.match(doc.querySelector('.dtb-caption').textContent, /^DS4P/);
  prefs.set({ enabled: false }); await settle(dom.window); assert.equal(doc.querySelector('.dtb-caption'), null);
  prefs.set({ enabled: true, colored: false }); await settle(dom.window);
  assert.equal(doc.querySelector('.dtb-band').dataset.band, 'plain');
  prefs.set({ modelName: 'original', bandLabel: 'full', showSuffix: true, showCountdown: false, appearance: 'badge' });
  text.data = 'DeepSeek-V4-Pro · x0.5'; await settle(dom.window);
  assert.equal(doc.querySelector('.dtb-model').textContent, 'DeepSeek-V4-Pro · x0.5');
  assert.equal(doc.querySelector('.dtb-band').textContent, '谷时');
  assert.equal(doc.querySelector('.dtb-band').dataset.appearance, 'badge');
  assert.equal(text.data, 'DeepSeek-V4-Pro · x0.5');
  prefs.reset(); await settle(dom.window);
  assert.equal(doc.querySelector('.dtb-caption').textContent, 'DS4P · 谷 2:00');
  button.remove(); doc.body.append(button.cloneNode(true)); await settle(dom.window);
  // Simulate a genuinely fresh native remount, with no plugin-owned DOM.
  doc.body.innerHTML = '<button aria-haspopup="menu" aria-busy="false"><span class="next_triggerLabel">deepseek-flash</span></button>';
  await settle(dom.window); assert.equal(doc.querySelectorAll('.dtb-caption').length, 1);
  stop(); assert.equal(doc.querySelector('.dtb-caption'), null); assert.equal(doc.querySelector('[data-dtb-original]'), null); assert.equal(tick, null);
  dom.window.close();
});
test('failed preference saves retain last accepted setting', () => {
  const prefs = createPreferences(() => ({ getItem: () => null, setItem() { throw new Error('quota'); } }));
  prefs.set({ enabled: false }); assert.equal(prefs.getSnapshot().enabled, true); assert.equal(prefs.getSnapshot().error, true);
});
test('React rerenders and unmounts the native control without losing nodes or handlers', async () => {
  const dom = new JSDOM('<div id="root"></div>', { pretendToBeVisual: true, url: 'http://localhost' });
  const before = { window: globalThis.window, document: globalThis.document };
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { flushSync } = await import('react-dom');
  const root = createRoot(dom.window.document.querySelector('#root'));
  let clicks = 0, stop;
  const render = name => flushSync(() => root.render(React.createElement('button', { 'aria-haspopup': 'menu', 'aria-busy': false, onClick: () => clicks++ },
    React.createElement('span', { className: 'rc2_triggerLabel' }, name), React.createElement('span', { className: 'rc2_triggerEffort' }, 'High'))));
  try {
    render('DeepSeek-V4-Pro');
    stop = mountModelLabels({ document: dom.window.document, preferences: createPreferences(() => dom.window.localStorage), calendar: createCalendarStore(() => dom.window.localStorage), clock: { getSnapshot: () => Date.parse('2026-10-15T09:30:00+08:00'), subscribe: () => () => {} } });
    render('DeepSeek-V41-Flash'); await settle(dom.window);
    assert.match(dom.window.document.querySelector('.dtb-caption').textContent, /^DS4.1F/);
    dom.window.document.querySelector('button').click(); assert.equal(clicks, 1);
    render('gpt-6.1-sol'); await settle(dom.window); assert.equal(dom.window.document.querySelector('.dtb-caption'), null);
    render('DeepSeek-V4-Pro'); await settle(dom.window); assert.equal(dom.window.document.querySelectorAll('.dtb-caption').length, 1);
    flushSync(() => root.unmount()); stop(); stop = null;
    assert.equal(dom.window.document.querySelector('.dtb-caption'), null);
  } finally { stop?.(); globalThis.window = before.window; globalThis.document = before.document; dom.window.close(); }
});
test('session-scoped IDs recognize aliases, reject misleading names and never cross composers', async () => {
  const dom = new JSDOM('<div id="a"><button aria-haspopup="menu" aria-busy="false"><span class="rc_triggerLabel">我的主力</span></button></div><div id="b"><button aria-haspopup="menu" aria-busy="false"><span class="rc_triggerLabel">DeepSeek-V4.1-Flash</span></button></div>', { pretendToBeVisual: true, url: 'http://localhost' });
  const makeStore = id => {
    let state = { current: { provider: 'test', model: id }, groups: [] };
    const listeners = new Set();
    return { getSnapshot: () => state, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }, select(id) { state = { ...state, current: { provider: 'test', model: id } }; for (const fn of listeners) fn(); }, listeners };
  };
  const a = makeStore('channel/deepseek-v4.1-flash'), b = makeStore('gpt-6.1');
  const prefs = createPreferences(() => dom.window.localStorage), calendar = createCalendarStore(() => dom.window.localStorage);
  const clock = { getSnapshot: () => Date.parse('2026-10-15T10:00:00+08:00'), subscribe: () => () => {} };
  const stopA = mountModelLabels({ document: dom.window.document, root: dom.window.document.querySelector('#a'), directory: a, preferences: prefs, calendar, clock });
  const stopB = mountModelLabels({ document: dom.window.document, root: dom.window.document.querySelector('#b'), directory: b, preferences: prefs, calendar, clock });
  try {
    assert.equal(dom.window.document.querySelector('#a .dtb-model').textContent, 'DS4.1F');
    assert.match(dom.window.document.querySelector('#a .dtb-caption').title, /channel\/deepseek-v4.1-flash/);
    assert.equal(dom.window.document.querySelector('#b .dtb-caption'), null);
    a.select('gpt-6.1'); b.select('deepseek-v4-pro'); await settle(dom.window);
    assert.equal(dom.window.document.querySelector('#a .dtb-caption'), null);
    assert.equal(dom.window.document.querySelector('#b .dtb-model').textContent, 'DS4P');
    // The ID supplies the version even when the previous visible label is misleading.
    stopA(); assert.ok(dom.window.document.querySelector('#b .dtb-caption'));
  } finally { stopA(); stopB(); assert.equal(a.listeners.size, 0); assert.equal(b.listeners.size, 0); dom.window.close(); }
});
