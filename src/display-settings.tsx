import { useSyncExternalStore } from 'react';
import { DEFAULT_PREFERENCES, DISPLAY_PRESETS } from './preferences.ts';
import type { Preferences, DisplayPreferences } from './preferences.ts';
import { formatCaption } from './presentation.ts';

const exampleModel = 'DeepSeek-V4.1-Flash · x0.11';
const presets = [['minimal', '极简'], ['standard', '标准'], ['detailed', '完整']] as const;
function Segments<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: readonly (readonly [T, string])[]; onChange(value: T): void }) {
  return <div className="dtb-segment-row"><span>{label}</span><div className="dtb-presets" role="group" aria-label={label}>{options.map(([key, title]) => <button type="button" key={key} aria-pressed={value === key} onClick={() => onChange(key)}>{title}</button>)}</div></div>;
}
export function DisplaySettings({ preferences }: { preferences: Preferences }) {
  const prefs = useSyncExternalStore(preferences.subscribe, preferences.getSnapshot);
  const preset = presets.find(([key]) => Object.keys(DEFAULT_PREFERENCES).filter(field => !['enabled', 'scope', 'nearMinutes'].includes(field)).every(field => prefs[field as keyof DisplayPreferences] === DISPLAY_PRESETS[key][field as keyof DisplayPreferences]))?.[0];
  const toggle = (field: 'enabled' | 'colored' | 'showSuffix', label: string, hint?: string) => <label title={hint}><strong>{label}</strong><input type="checkbox" role="switch" checked={prefs[field]} onChange={e => preferences.set({ [field]: e.target.checked })} /></label>;
  return <section className="dtb-preferences" aria-label="显示偏好">
    <div className="dtb-section-heading"><h3>显示偏好</h3><div className="dtb-heading-actions"><div className="dtb-presets" role="group" aria-label="显示预设">{presets.map(([key, title]) => <button type="button" key={key} aria-pressed={preset === key} onClick={() => preferences.applyPreset(key)}>{title}</button>)}</div><button type="button" className="dtb-reset" onClick={() => preferences.reset()}>恢复默认</button></div></div>
    <div className="dtb-display-surface">
      <div className="dtb-live-controls">{toggle('enabled', '启用峰谷提示', '只调整 DeepSeek 模型的显示文字')}
      {prefs.enabled && <>
        <Segments label="模型名称" value={prefs.modelName} options={[["compact", "DS 简写"], ["original", "原始名称"]]} onChange={modelName => preferences.set({ modelName })} />
        <Segments label="提示样式" value={prefs.appearance} options={[["text", "纯文字"], ["badge", "轻标签"]]} onChange={appearance => preferences.set({ appearance })} />
        <Segments label="倒计时" value={prefs.countdownMode} options={[["always", "始终"], ["near", "临近切换"], ["off", "关闭"]]} onChange={countdownMode => preferences.set({ countdownMode })} />
        {prefs.countdownMode === 'near' && <Segments label="提前显示" value={prefs.nearMinutes} options={[[30, "30 分钟"], [60, "60 分钟"]]} onChange={nearMinutes => preferences.set({ nearMinutes })} />}
      </>}</div>
      <div className="dtb-sample" aria-label="显示效果预览">
        <div className="dtb-preview-heading"><strong>效果预览</strong><span>{!prefs.enabled ? '提示已关闭' : prefs.countdownMode === 'near' ? '示例 · 距切换 20 分钟' : '示例 · 随设置即时变化'}</span></div>
        <div className="dtb-preview-examples">{(['peak', 'offpeak'] as const).map(band => {
          const display = formatCaption(exampleModel, prefs, { band, countdown: prefs.countdownMode === 'near' ? '0:20' : '2:30' })!;
          return <div className="dtb-preview-example" key={band}><span className="dtb-example-label">{band === 'peak' ? '峰时' : '谷时'}</span><span className="dtb-preview-trigger"><span className="dtb-caption"><span>{display.model}</span>{display.band && <span className="dtb-band" data-band={prefs.colored ? band : 'plain'} data-appearance={prefs.appearance}>{display.band}</span>}</span><span className="dtb-preview-effort">· High</span><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg></span></div>;
        })}</div>
        <small className="dtb-preview-note">{prefs.enabled ? '仅改变显示，模型与推理强度保持原样。' : '重新开启后可调整名称、样式和倒计时。'}</small>
      </div>
    </div>
    {prefs.enabled && <details className="dtb-display-more"><summary><span>更多显示选项</span><small>{prefs.scope === 'official' ? '仅官方来源' : '所有 DeepSeek 来源'} · {prefs.colored ? '时段颜色' : '跟随文字颜色'}</small><span aria-hidden="true">⌄</span></summary><div className="dtb-more-body">
      <Segments label="峰谷文字" value={prefs.bandLabel} options={[["short", "峰 / 谷"], ["full", "峰时 / 谷时"]]} onChange={bandLabel => preferences.set({ bandLabel })} />
      <Segments label="生效范围" value={prefs.scope} options={[["all", "所有 DeepSeek"], ["official", "仅官方来源"]]} onChange={scope => preferences.set({ scope })} />
      <div className="dtb-switch-grid">{toggle('showSuffix', '保留价格后缀', '保留原模型名称中已有的倍率等文字')}{toggle('colored', '时段颜色', '谷时青绿，峰时琥珀')}</div>
      <p>仅官方来源使用 DSH 的官方账号与官方 API 标识；第三方渠道仅显示官方时段参考，实际价格以渠道为准。</p>
    </div></details>}
    {prefs.error && <p role="alert">设置未能保存，当前保留上次成功保存的效果，请检查本地存储后重试。</p>}
  </section>;
}
