import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import * as jsxRuntime from 'react/jsx-runtime';
import type { ModelState } from '../src/model-identity.ts';

type Entry = { inject: (sessionId?: string) => Record<string, unknown>; component: React.ComponentType<any> };
const entries = new Map<string, Entry>();
let effects: (() => void)[] = [], active = false;
let plugin: { apply(ctx: unknown): void };
let now = Date.parse('2026-10-15T11:59:59+08:00');
Date.now = () => now;
let state: ModelState = { current: { provider: 'fixture', model: 'channel/deepseek-v4.1-flash' }, groups: [{ id: 'fixture', models: [{ id: 'channel/deepseek-v4.1-flash', name: '主力模型' }, { id: 'gpt-6.1', name: 'DeepSeek-V4.1-Flash' }] }] };
const listeners = new Set<() => void>();
const store = { getSnapshot: () => state, subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; } };
const root = createRoot(document.getElementById('app')!);
const redraw = () => flushSync(() => root.render(<Fixture />));
const mount = () => {
  active = true;
  plugin.apply({
    effect(fn: () => void | (() => void)) { const stop = fn(); if (stop) effects.push(stop); },
    modelDirectories: { directoryFor: () => ({ store }) },
    slots: {
      inject(_name: string, callback: () => (() => void) | void) { const stop = callback(); if (stop) effects.push(stop); },
      register(options: { name: string; inject: Entry['inject'] }, component: Entry['component']) {
        entries.set(options.name, { inject: options.inject, component });
        return () => { entries.delete(options.name); };
      },
    },
  });
  redraw();
};
const unmount = () => { active = false; redraw(); for (const stop of effects.reverse()) stop(); effects = []; entries.clear(); };
const select = (model: string) => { state = { ...state, current: { provider: 'fixture', model } }; for (const fn of listeners) fn(); };
function Fixture() {
  const selection = React.useSyncExternalStore(store.subscribe, store.getSnapshot);
  const selected = selection.groups[0]!.models.find(model => model.id === selection.current?.model)!;
  const binding = entries.get('conversation.input.right'), settings = entries.get('plugins.bundle.config');
  return <>
    <div className="fixture-tools"><button onClick={() => select('channel/deepseek-v4.1-flash')}>DeepSeek 别名模型</button><button onClick={() => select('gpt-6.1')}>非 DeepSeek ID</button><button onClick={() => { now = Date.parse('2026-10-15T12:00:00+08:00'); window.dispatchEvent(new Event('focus')); }}>切换到 12:00</button><button onClick={() => active ? unmount() : mount()}>{active ? '卸载插件' : '加载插件'}</button></div>
    <div className="fixture-native fixture_standardControls"><div data-slot="conversation.input.right" style={{display: 'contents'}}>{active && binding && React.createElement(binding.component, binding.inject('fixture'))}</div><button className="fixture-trigger" aria-label={`选择模型：${selected.name}`} aria-haspopup="menu" aria-busy={false} onClick={() => { document.getElementById('fixture-menu')!.hidden = !document.getElementById('fixture-menu')!.hidden; }}><span className="fixture_triggerLabel">{selected.name}</span><span className="fixture_triggerEffort">High</span><span>⌄</span></button><div id="fixture-menu" hidden>原生菜单点击仍有效</div></div>
    {active && settings && React.createElement(settings.component, { ...settings.inject(), view: 'page' })}
  </>;
}
const registry: Record<string, unknown> = { react: React, 'react/jsx-runtime': jsxRuntime };
(window as unknown as { __ModuleLoader__: unknown }).__ModuleLoader__ = { load(registration: { factory: (require: (id: string) => unknown) => typeof plugin }) { plugin = registration.factory(id => { if (!(id in registry)) throw new Error(`Undeclared runtime dependency: ${id}`); return registry[id]; }); mount(); } };
const script = document.createElement('script'); script.src = '/client.js'; document.head.append(script);
