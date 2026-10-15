import test from 'node:test';
import assert from 'node:assert/strict';
import { createClock } from '../src/clock.ts';
test('clock aligns minutes normally, seconds only while requested, suspends hidden and cleans up', context => {
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  const win = new EventTarget();
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: win });
  context.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000 });
  let stop: (() => void) | undefined;
  try {
    const clock = createClock(); let updates = 0;
    const unsubscribe = clock.subscribe(() => updates++);
    stop = clock.start();
    const initial = updates;
    context.mock.timers.tick(58_000); assert.equal(updates, initial);
    context.mock.timers.tick(1000); assert.equal(clock.getSnapshot(), 60_000);
    let seconds = 0;
    const stopSeconds = clock.subscribeSeconds(() => seconds++);
    const first = seconds;
    context.mock.timers.tick(1000); assert.equal(seconds, first + 1); assert.equal(clock.getSnapshot(), 61_000);
    stopSeconds(); const quiet = updates;
    context.mock.timers.tick(58_000); assert.equal(updates, quiet);
    context.mock.timers.tick(1000); assert.equal(clock.getSnapshot(), 120_000);
    doc.visibilityState = 'hidden'; doc.dispatchEvent(new Event('visibilitychange'));
    const paused = updates; context.mock.timers.tick(8 * 3600000); assert.equal(updates, paused);
    doc.visibilityState = 'visible'; win.dispatchEvent(new Event('focus')); assert.equal(clock.getSnapshot(), Date.now());
    stop(); const disposed = updates;
    context.mock.timers.tick(120_000); win.dispatchEvent(new Event('focus')); doc.dispatchEvent(new Event('visibilitychange'));
    assert.equal(updates, disposed); unsubscribe();
  } finally {
    stop?.();
    if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument); else Reflect.deleteProperty(globalThis, 'document');
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow); else Reflect.deleteProperty(globalThis, 'window');
  }
});
