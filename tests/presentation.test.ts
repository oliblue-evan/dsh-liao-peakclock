import test from 'node:test';
import assert from 'node:assert/strict';
import { shortModelName, compactCountdown, detailedCountdown, bandPresentation, formatCaption } from '../src/presentation.ts';
import { DEFAULT_PREFERENCES, DISPLAY_PRESETS } from '../src/preferences.ts';
import { calendar } from '../src/calendar.ts';
test('compact labels retain specific model, hide price only in presentation, reject unrelated names', () => {
  assert.equal(shortModelName('Deepseek-V4.1-Flash · x0.11'), 'DS4.1F');
  assert.equal(shortModelName('DeepSeek-V41-Flash'), 'DS4.1F');
  assert.equal(shortModelName('deepseek-v4-pro'), 'DS4P');
  assert.equal(shortModelName('DeepSeek-Flash'), 'DSF');
  assert.equal(shortModelName('DeepSeekish-model'), null);
  assert.equal(shortModelName('gpt-6.1-sol'), null);
});
test('countdown is hours:minutes, rounds up and keeps long weekends', () => {
  assert.equal(compactCountdown(150 * 60_000), '2:30');
  assert.equal(compactCountdown(1), '0:01');
  assert.equal(compactCountdown(0), '0:00');
  assert.equal(compactCountdown(72 * 3600_000), '72:00');
});
test('real schedule boundaries and missing calendars are honest', () => {
  const at = (s: string) => Date.parse(`${s}+08:00`);
  assert.equal(bandPresentation(at('2026-10-15T09:30:00'), calendar).text, '峰 2:30');
  assert.equal(bandPresentation(at('2026-10-15T12:00:00'), calendar).text, '谷 2:00');
  assert.equal(bandPresentation(at('2027-03-01T10:00:00'), calendar).text, '待核实');
});
test('settings countdown counts seconds and the destination follows the actual next band', () => {
  assert.equal(detailedCountdown(150 * 60_000), '2:30:00');
  assert.equal(detailedCountdown(1), '0:00:01');
  assert.equal(detailedCountdown(-1), '0:00:00');
  assert.equal(detailedCountdown(72 * 3600_000), '72:00:00');
  const at = (s: string) => Date.parse(`${s}+08:00`);
  const before = bandPresentation(at('2026-10-15T11:59:59'), calendar);
  assert.equal(before.next?.band, 'offpeak');
  assert.equal(detailedCountdown(before.next!.at - at('2026-10-15T11:59:59')), '0:00:01');
  const after = bandPresentation(at('2026-10-15T12:00:00'), calendar);
  assert.equal(after.next?.band, 'peak');
  assert.equal(detailedCountdown(after.next!.at - at('2026-10-15T12:00:00')), '2:00:00');
  assert.equal(bandPresentation(at('2027-03-01T10:00:00'), calendar).next, null);
});

test('preview and native caption share all display options and retain unknown-calendar honesty', () => {
  const source = 'DeepSeek-V4.1-Flash · x0.11';
  const status = { band: 'peak' as const, countdown: '2:30' };
  assert.deepEqual(formatCaption(source, DEFAULT_PREFERENCES, status), { model: 'DS4.1F', band: ' · 峰 2:30' });
  assert.deepEqual(formatCaption(source, DISPLAY_PRESETS.minimal, status), { model: 'DS4.1F', band: ' · 峰' });
  assert.deepEqual(formatCaption(source, DISPLAY_PRESETS.detailed, { band: 'offpeak', countdown: '2:30' }), { model: source, band: '谷时 2:30' });
  assert.deepEqual(formatCaption(source, { ...DEFAULT_PREFERENCES, enabled: false }, status), { model: source, band: '' });
  assert.equal(formatCaption('gpt-6.1-sol', DEFAULT_PREFERENCES, status), null);
  assert.equal(formatCaption(source, DEFAULT_PREFERENCES, { band: 'unknown', countdown: null })!.band, ' · 待核实');
  assert.match(formatCaption(source, DEFAULT_PREFERENCES, { band: 'offpeak', countdown: null })!.band, /谷.*待核实/);
  assert.equal(formatCaption(source, { ...DEFAULT_PREFERENCES, showCountdown: false }, { band: 'offpeak', countdown: null })!.band, ' · 谷');
});
test('model identity takes precedence over aliases and provider-prefixed names', () => {
  const status = { band: 'peak' as const, countdown: '2:30' };
  assert.equal(formatCaption('主力模型', DEFAULT_PREFERENCES, status, { id: 'channel/deepseek-v4.1-flash' })!.model, 'DS4.1F');
  assert.equal(formatCaption('DeepSeek-V4.1-Flash', DEFAULT_PREFERENCES, status, { id: 'deepseek-v4-pro' })!.model, 'DS4P');
  assert.equal(formatCaption('DeepSeek-V4.1-Flash', DEFAULT_PREFERENCES, status, { id: 'gpt-6.1' }), null);
  assert.equal(formatCaption('DeepSeek-V41-Flash', DEFAULT_PREFERENCES, status, { id: 'deepseek-flash' })!.model, 'DS4.1F');
  assert.equal(shortModelName('channel/deepseek-v4.1-flash'), 'DS4.1F');
});

test('near countdown respects exact threshold, official scope uses stable IDs and never hides the band', () => {
  const near={...DEFAULT_PREFERENCES,countdownMode:'near' as const,nearMinutes:30 as const};
  const source='DeepSeek-V4.1-Flash', status={band:'peak' as const,countdown:'0:30',remainingMs:30*60_000};
  assert.match(formatCaption(source,near,status)!.band,/0:30/);
  assert.equal(formatCaption(source,near,{...status,remainingMs:30*60_000+1})!.band,' · 峰');
  assert.equal(formatCaption(source,near,{band:'unknown',countdown:null})!.band,' · 待核实');
  const official={...near,scope:'official' as const};
  for(const provider of ['deepseek-account','deepseek-official']) assert.ok(formatCaption(source,official,status,{id:'deepseek-v4.1-flash',provider}));
  for(const provider of ['DeepSeek','deepseek-proxy','channel']) assert.equal(formatCaption(source,official,status,{id:'deepseek-v4.1-flash',provider}),null);
});
