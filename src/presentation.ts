import { isDeepSeek } from './model-identity.ts';
import type { ModelIdentity } from './model-identity.ts';
import { createScheduleReader } from './schedule.ts';
import type { HolidayCalendar } from './calendar.ts';
import type { DisplayPreferences } from './preferences.ts';
import type { Band } from './schedule.ts';

export function shortModelName(label: string): string | null {
  const name = label.trim().split(/[·•]/, 1)[0]!.trim();
  if (!isDeepSeek(name)) return null;
  const specific = name.replace(/^(?:[^/]+\/)*?deepseek[\s/_-]*/i, '').replace(/[_/-]+/g, ' ')
    .replace(/\bV41\b/gi, '4.1').replace(/\bv(?=\d)/gi, '')
    .replace(/\bflash\b/gi, 'F').replace(/\bpro\b/gi, 'P');
  return `DS${specific.replace(/\s+/g, '')}`;
}

export function compactCountdown(milliseconds: number): string {
  const minutes = Math.max(0, Math.ceil(milliseconds / 60_000));
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Settings show seconds; the compact model caption deliberately stays H:MM. */
export function detailedCountdown(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Shared by the real native caption and both preview examples. */
export function formatCaption(original: string, prefs: DisplayPreferences, status: { band: Band; countdown: string | null }, identity?: ModelIdentity) {
  if (identity && !isDeepSeek(identity.id)) return null;
  const idHasVersion = identity && /deepseek[\s/_-]+v?\d/i.test(identity.id);
  const compact = identity
    ? idHasVersion ? shortModelName(identity.id) : shortModelName(identity.name ?? '') ?? shortModelName(original) ?? shortModelName(identity.id)
    : shortModelName(original);
  if (!compact) return null;
  if (!prefs.enabled) return { model: original, band: '' };
  const suffixAt = original.search(/[·•]/);
  const base = suffixAt < 0 ? original.trim() : original.slice(0, suffixAt).trim();
  const suffix = suffixAt < 0 ? '' : ` ${original.slice(suffixAt).trim()}`;
  const model = (prefs.modelName === 'compact' ? compact : base) + (prefs.showSuffix ? suffix : '');
  const label = status.band === 'unknown' ? '待核实' : status.band === 'peak' ? (prefs.bandLabel === 'full' ? '峰时' : '峰') : (prefs.bandLabel === 'full' ? '谷时' : '谷');
  const text = `${label}${prefs.showCountdown && status.band !== 'unknown' ? ` ${status.countdown ?? '· 待核实'}` : ''}`;
  return { model, band: `${prefs.appearance === 'text' ? ' · ' : ''}${text}` };
}
const readSchedule = createScheduleReader();
export function bandPresentation(now: number, data: HolidayCalendar) {
  const schedule = readSchedule(now, data);
  const verified = schedule.band !== 'unknown' && schedule.next?.band !== 'unknown' && schedule.next !== null;
  const name = schedule.band === 'peak' ? '峰' : schedule.band === 'offpeak' ? '谷' : '待核实';
  const text = verified ? `${name} ${compactCountdown(schedule.next!.at - now)}` : `${name}${name === '待核实' ? '' : ' · 待核实'}`;
  const next = verified ? new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(schedule.next!.at) : null;
  return { band: schedule.band, text, countdown: verified ? compactCountdown(schedule.next!.at - now) : null, next: verified ? schedule.next : null, nextTime: next, detail: `DeepSeek 官方峰谷参考（北京时间）${next ? `；下次切换：${next}` : '；节假日日历覆盖不足，切换时间待核实'}。第三方渠道可能采用不同计费规则。` };
}
