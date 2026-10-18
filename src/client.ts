import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client';
import { createClock } from './clock.ts';
import { createCalendarStore } from './calendar-store.ts';
import { createCalendarUpdater } from './calendar-updater.ts';
import { createPreferences } from './preferences.ts';
import { ModelBinding } from './model-binding.tsx';
import type {} from '@deepseek-ai/dsh-client-ui-model-selection/client';
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client';
import { Settings } from './settings.tsx';
import css from './style.css';

export const name = 'peakclock';
export const inject = ['slots', 'modelDirectories'];
export function apply(ctx: Context): void {
  ctx.effect(() => {
    const style = document.createElement('style');
    style.dataset.plugin = 'dsh-liao-peakclock'; style.textContent = css;
    document.head.append(style); return () => style.remove();
  });
  const clock = createClock(), calendarStore = createCalendarStore(), preferences = createPreferences();
  const updater = createCalendarUpdater({ clock, store: calendarStore });
  ctx.effect(() => clock.start());
  ctx.effect(() => calendarStore.start());
  ctx.effect(() => updater.start());
  ctx.effect(() => preferences.start());
  ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
    name: 'conversation.input.right', id: 'peakclock',
    inject: sessionId => ({ directory: ctx.modelDirectories.directoryFor(sessionId).store, preferences, calendarStore, clock }),
  }, ModelBinding));
  ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
    name: 'plugins.bundle.config', key: 'dsh-liao-peakclock',
    inject: () => ({ clock, calendarStore, preferences }),
  }, Settings));
}
