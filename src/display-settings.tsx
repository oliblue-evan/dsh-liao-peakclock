import { useSyncExternalStore } from 'react';
import { DEFAULT_PREFERENCES, DISPLAY_PRESETS } from './preferences.ts';
import type { Preferences } from './preferences.ts';
import { formatCaption } from './presentation.ts';

const exampleModel = 'DeepSeek-V4.1-Flash · x0.11';
const presets = [['minimal', '极简'], ['standard', '标准'], ['detailed', '完整']] as const;
export function DisplaySettings({ preferences }: { preferences: Preferences }) {
  const prefs = useSyncExternalStore(preferences.subscribe, preferences.getSnapshot);
  const preset = presets.find(([key]) => Object.keys(DEFAULT_PREFERENCES).filter(field => field !== 'enabled').every(field => prefs[field as keyof typeof DEFAULT_PREFERENCES] === DISPLAY_PRESETS[key][field as keyof typeof DEFAULT_PREFERENCES]))?.[0];
  return <section className="dtb-preferences" aria-label="显示偏好">
    <div className="dtb-section-heading"><h3>显示偏好</h3><button type="button" className="dtb-reset" onClick={() => preferences.reset()}>恢复默认</button></div>
    <div className="dtb-sample" aria-label="显示效果预览">
      <div className="dtb-preview-heading"><strong>效果预览</strong><span>{prefs.enabled ? '示例模型 · 随设置即时变化' : '提示已关闭 · 显示原始名称'}</span></div>
      <div className="dtb-preview-examples">{(['peak', 'offpeak'] as const).map(band => {
        const display = formatCaption(exampleModel, prefs, { band, countdown: '2:30' })!;
        return <div className="dtb-preview-example" key={band}><span className="dtb-example-label">{band === 'peak' ? '峰时' : '谷时'}</span><span className="dtb-preview-trigger"><span className="dtb-caption"><span>{display.model}</span>{display.band && <span className="dtb-band" data-band={prefs.colored ? band : 'plain'} data-appearance={prefs.appearance}>{display.band}</span>}</span><span className="dtb-preview-effort">· High</span><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg></span></div>;
      })}</div>
    </div>
    <div className="dtb-preset-row"><div className="dtb-presets" role="group" aria-label="显示预设">{presets.map(([key, title]) => <button type="button" key={key} aria-pressed={preset === key} onClick={() => preferences.applyPreset(key)}>{title}</button>)}</div><span>{preset ? '选择预设后可继续微调' : '自定义 · 即时生效'}</span></div>
    <div className="dtb-controls dtb-display-controls">
      <div className="dtb-select-grid" role="group" aria-label="名称与样式">
        <label><strong>模型名称</strong><select value={prefs.modelName} onChange={e => preferences.set({ modelName: e.target.value as 'compact' | 'original' })}><option value="compact">DS 简写</option><option value="original">原始名称</option></select></label>
        <label><strong>提示样式</strong><select value={prefs.appearance} onChange={e => preferences.set({ appearance: e.target.value as 'text' | 'badge' })}><option value="text">纯文字</option><option value="badge">轻标签</option></select></label>
        <label><strong>峰谷文字</strong><select value={prefs.bandLabel} onChange={e => preferences.set({ bandLabel: e.target.value as 'short' | 'full' })}><option value="short">峰 / 谷</option><option value="full">峰时 / 谷时</option></select></label>
      </div>
      <div className="dtb-switch-grid" role="group" aria-label="显示开关">
        <label title="只调整 DeepSeek 模型的显示文字"><strong>启用峰谷提示</strong><input type="checkbox" role="switch" checked={prefs.enabled} onChange={e => preferences.set({ enabled: e.target.checked })} /></label>
        <label title="显示时、分，例如 2:30"><strong>显示倒计时</strong><input type="checkbox" role="switch" checked={prefs.showCountdown} onChange={e => preferences.set({ showCountdown: e.target.checked })} /></label>
        <label title="保留原模型名称中已有的倍率等文字"><strong>保留价格后缀</strong><input type="checkbox" role="switch" checked={prefs.showSuffix} onChange={e => preferences.set({ showSuffix: e.target.checked })} /></label>
        <label title="谷时青绿，峰时琥珀"><strong>时段颜色</strong><input type="checkbox" role="switch" checked={prefs.colored} onChange={e => preferences.set({ colored: e.target.checked })} /></label>
      </div>
    </div>
    {prefs.error && <p role="alert">设置未能保存，当前保留上次成功保存的效果，请检查本地存储后重试。</p>}
  </section>;
}
