import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreferences, DEFAULT_PREFERENCES, DISPLAY_PRESETS, PREFERENCES_KEY } from '../src/preferences.ts';
test('legacy toggles survive new options and invalid values fall back safely', () => {
  const storage = { getItem: () => JSON.stringify({ enabled: false, colored: false, modelName: 'bogus', showSuffix: 'yes', appearance: '<script>' }), setItem() {} };
  const state = createPreferences(() => storage).getSnapshot();
  assert.equal(state.enabled, false); assert.equal(state.colored, false);
  assert.equal(state.modelName, 'compact'); assert.equal(state.showSuffix, false); assert.equal(state.appearance, 'text');
});
test('all options persist, reload and reset without overwriting unrelated storage', () => {
  const saved = new Map<string, string>([['unrelated', 'keep']]);
  const storage = { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => { saved.set(key, value); } };
  const store = createPreferences(() => storage);
  store.set({ ...DISPLAY_PRESETS.detailed, colored: false });
  const reloaded = createPreferences(() => storage);
  assert.equal(reloaded.getSnapshot().showSuffix, true);
  assert.equal(reloaded.getSnapshot().appearance, 'badge'); assert.equal(reloaded.getSnapshot().colored, false);
  reloaded.reset(); assert.deepEqual(reloaded.getSnapshot(), { ...DEFAULT_PREFERENCES, error: false });
  assert.equal(saved.get('unrelated'), 'keep'); assert.equal(JSON.parse(saved.get(PREFERENCES_KEY)!).error, undefined);
});
test('failed save or reset retains the entire last accepted display state', () => {
  const store = createPreferences(() => ({ getItem: () => JSON.stringify(DISPLAY_PRESETS.detailed), setItem() { throw new Error('quota'); } }));
  store.reset(); assert.deepEqual(store.getSnapshot(), { ...DISPLAY_PRESETS.detailed, error: true });
});
test('appearance presets preserve the enabled switch and legacy options migrate once', () => {
  const saved = new Map<string, string>([['dsh-timeband/compact-preferences/v1', JSON.stringify({ ...DISPLAY_PRESETS.detailed, enabled: false })]]);
  const storage = { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => { saved.set(key, value); } };
  const store = createPreferences(() => storage);
  assert.equal(store.getSnapshot().enabled, false); assert.ok(saved.has(PREFERENCES_KEY));
  store.applyPreset('minimal'); assert.equal(store.getSnapshot().enabled, false); assert.equal(store.getSnapshot().showCountdown, false);
  saved.set('dsh-timeband/compact-preferences/v1', JSON.stringify({ enabled: true }));
  assert.equal(createPreferences(() => storage).getSnapshot().enabled, false);
});
