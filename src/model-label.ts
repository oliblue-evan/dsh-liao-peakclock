import { selectedIdentity } from './model-identity.ts';
import type { ModelStore } from './model-identity.ts';
import { bandPresentation, formatCaption } from './presentation.ts';
import type { CalendarStore } from './calendar-store.ts';
import type { Preferences } from './preferences.ts';

/** Exact native ModelSelect signature in DSH 0.2.0-rc.2. React owns the
 * original label; we only add a sibling, and never replace its text/children. */
const selector = 'button[aria-haspopup="menu"][aria-busy] > span[class*="_triggerLabel"]';
export function mountModelLabels(options: {
  document: Document; root?: HTMLElement; directory?: ModelStore; preferences: Preferences; calendar: CalendarStore;
  clock: { getSnapshot(): number; subscribe(fn: () => void): () => void };
}) {
  const { document: doc, preferences, calendar, clock } = options;
  const win = doc.defaultView!;
  const root = options.root ?? doc.body;
  const entries = new Map<HTMLElement, { button: HTMLElement; caption: HTMLElement; name: HTMLElement; band: HTMLElement }>();
  let pending: number | undefined, disposed = false;
  const restore = (label: HTMLElement) => {
    const entry = entries.get(label); if (!entry) return;
    entry.caption.remove(); label.removeAttribute('data-dtb-original');
    entry.button.removeAttribute('data-dtb-trigger'); entries.delete(label);
  };
  const update = () => {
    pending = undefined; if (disposed) return;
    const prefs = preferences.getSnapshot();
    const identity = options.directory ? selectedIdentity(options.directory.getSnapshot()) : undefined;
    const presentation = bandPresentation(clock.getSnapshot(), calendar.getSnapshot().data);
    for (const label of entries.keys()) if (!root.contains(label) || !label.isConnected || !prefs.enabled || !formatCaption(label.textContent ?? '', prefs, presentation, identity)) restore(label);
    if (!prefs.enabled) return;
    for (const label of root.querySelectorAll<HTMLElement>(selector)) {
      const original = label.textContent ?? '', display = formatCaption(original, prefs, presentation, identity);
      if (!display) continue;
      let entry = entries.get(label);
      if (!entry) {
        const button = label.parentElement!;
        const caption = doc.createElement('span'), model = doc.createElement('span'), band = doc.createElement('span');
        caption.className = 'dtb-caption'; caption.setAttribute('aria-hidden', 'true');
        model.className = 'dtb-model'; band.className = 'dtb-band';
        caption.append(model, band); label.before(caption);
        label.setAttribute('data-dtb-original', ''); button.setAttribute('data-dtb-trigger', '');
        entry = { button, caption, name: model, band }; entries.set(label, entry);
      }
      if (entry.name.textContent !== display.model) entry.name.textContent = display.model;
      if (entry.band.textContent !== display.band) entry.band.textContent = display.band;
      entry.band.dataset.band = prefs.colored ? presentation.band : 'plain';
      entry.band.dataset.appearance = prefs.appearance;
      entry.caption.title = `${original}${identity ? `\n模型 ID：${identity.id} · 来源：${identity.provider ?? '未知'}` : ''}\n${presentation.detail}`;
    }
  };
  const queue = () => { if (!disposed && pending === undefined) pending = win.requestAnimationFrame(update); };
  const observer = new win.MutationObserver(records => {
    if (records.some(record => {
      const node = record.target.nodeType === 1 ? record.target as Element : record.target.parentElement;
      if (node?.closest('.dtb-caption, .dtb-settings')) return false;
      if (node?.closest('button[data-dtb-trigger]') || node?.closest(selector)) return true;
      if (record.removedNodes.length && entries.size) return true;
      return [...record.addedNodes].some(added => added.nodeType === 1 && ((added as Element).matches(selector) || (added as Element).querySelector(selector)));
    })) queue();
  });
  observer.observe(root, { childList: true, subtree: true, characterData: true });
  let minute = Math.floor(clock.getSnapshot() / 60_000);
  const stops = [preferences.subscribe(queue), calendar.subscribe(queue), clock.subscribe(() => {
    const next = Math.floor(clock.getSnapshot() / 60_000);
    if (next !== minute) { minute = next; queue(); }
  })];
  if (options.directory) stops.push(options.directory.subscribe(queue));
  update();
  return () => { disposed = true; observer.disconnect(); if (pending !== undefined) win.cancelAnimationFrame(pending); stops.forEach(stop => stop()); for (const label of entries.keys()) restore(label); };
}
