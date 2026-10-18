import { readStored } from './storage.ts';
export const PREFERENCES_KEY = 'dsh-liao-peakclock/compact-preferences/v1';
export interface DisplayPreferences {
  enabled: boolean;
  colored: boolean;
  modelName: 'compact' | 'original';
  bandLabel: 'short' | 'full';
  showCountdown: boolean; // Legacy flag retained for existing preferences.
  countdownMode: 'always' | 'near' | 'off';
  nearMinutes: 30 | 60;
  scope: 'all' | 'official';
  showSuffix: boolean;
  appearance: 'text' | 'badge';
}
export const DEFAULT_PREFERENCES: Readonly<DisplayPreferences> = Object.freeze({
  enabled: true, colored: true, modelName: 'compact', bandLabel: 'short',
  showCountdown: true, showSuffix: false, appearance: 'text', countdownMode: 'always', nearMinutes: 30, scope: 'all',
});
export const DISPLAY_PRESETS: Readonly<Record<'minimal' | 'standard' | 'detailed', DisplayPreferences>> = {
  minimal: { ...DEFAULT_PREFERENCES, showCountdown: false, countdownMode: 'off' },
  standard: { ...DEFAULT_PREFERENCES },
  detailed: { ...DEFAULT_PREFERENCES, modelName: 'original', bandLabel: 'full', showSuffix: true, appearance: 'badge' },
};
function normalize(value: unknown): DisplayPreferences {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const result = { ...DEFAULT_PREFERENCES };
  for (const key of ['enabled', 'colored', 'showCountdown', 'showSuffix'] as const) {
    if (typeof source[key] === 'boolean') result[key] = source[key];
  }
  if (source.modelName === 'compact' || source.modelName === 'original') result.modelName = source.modelName;
  if (source.bandLabel === 'short' || source.bandLabel === 'full') result.bandLabel = source.bandLabel;
  if (source.appearance === 'text' || source.appearance === 'badge') result.appearance = source.appearance;
  if (source.countdownMode === 'always' || source.countdownMode === 'near' || source.countdownMode === 'off') result.countdownMode = source.countdownMode;
  else result.countdownMode = result.showCountdown ? 'always' : 'off';
  result.showCountdown = result.countdownMode !== 'off';
  if (source.nearMinutes === 30 || source.nearMinutes === 60) result.nearMinutes = source.nearMinutes;
  if (source.scope === 'all' || source.scope === 'official') result.scope = source.scope;
  return result;
}
export function createPreferences(getStorage: () => Pick<Storage, 'getItem' | 'setItem'> = () => window.localStorage) {
  const listeners = new Set<() => void>();
  const read = () => {
    try { return { ...normalize(JSON.parse(readStored(getStorage(), PREFERENCES_KEY, 'dsh-peakclock/compact-preferences/v1', 'dsh-oliblue-deepseek-time/compact-preferences/v1', 'dsh-timeband/compact-preferences/v1') ?? '{}')), error: false }; }
    catch { return { ...DEFAULT_PREFERENCES, error: true }; }
  };
  let state = read();
  const emit = () => { for (const listener of listeners) listener(); };
  const refresh = () => { const next = read(); if (JSON.stringify(next) !== JSON.stringify(state)) { state = next; emit(); } };
  const set = (patch: Partial<DisplayPreferences>) => {
    const next = normalize({ ...state, ...patch, ...(patch.showCountdown !== undefined && patch.countdownMode === undefined ? {countdownMode: patch.showCountdown ? 'always' : 'off'} : {}) });
    try { getStorage().setItem(PREFERENCES_KEY, JSON.stringify(next)); state = { ...next, error: false }; }
    catch { state = { ...state, error: true }; }
    emit();
  };
  return {
    getSnapshot: () => state,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    set,
    applyPreset: (preset: keyof typeof DISPLAY_PRESETS) => set({ ...DISPLAY_PRESETS[preset], enabled: state.enabled, scope: state.scope, nearMinutes: state.nearMinutes }),
    reset: () => set(DEFAULT_PREFERENCES),
    start() {
      const onStorage = (e: StorageEvent) => { if (e.key === PREFERENCES_KEY || e.key === null) refresh(); };
      window.addEventListener('storage', onStorage); window.addEventListener('focus', refresh);
      return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('focus', refresh); };
    },
  };
}
export type Preferences = ReturnType<typeof createPreferences>;
