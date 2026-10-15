import { useSyncExternalStore } from 'react';
import type { Preferences } from './preferences.ts';
import type { CalendarStore } from './calendar-store.ts';
import { bandPresentation, detailedCountdown } from './presentation.ts';
import { DisplaySettings } from './display-settings.tsx';
import { calendarCoverage, chinaDay, todaySegments } from './schedule.ts';

// Official CNY snapshot checked 2026-10-15; never a third-party rate or live bill.
const CNY_PRICING_SOURCE = 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing/';
const priceCards = [
  { name: 'V4.1 Flash', rows: [['输入 · 缓存命中', '0.02', '0.04'], ['输入 · 未命中', '1', '2'], ['输出', '4', '8']] },
  { name: 'V4 Pro', rows: [['输入 · 缓存命中', '0.15', '0.30'], ['输入 · 未命中', '4.5', '9'], ['输出', '13.5', '27']] },
] as const;

function Chevron() {
  return <svg className="dtb-disclosure-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m6 4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function Settings({ view, preferences, calendarStore, clock }: {
  view: 'page' | 'summary'; preferences: Preferences; calendarStore: CalendarStore;
  clock: { getSnapshot(): number; subscribe(fn: () => void): () => void; subscribeSeconds?(fn: () => void): () => void };
}) {
  const prefs = useSyncExternalStore(preferences.subscribe, preferences.getSnapshot);
  const calendar = useSyncExternalStore(calendarStore.subscribe, calendarStore.getSnapshot);
  const now = useSyncExternalStore(view === 'page' ? clock.subscribeSeconds ?? clock.subscribe : clock.subscribe, clock.getSnapshot);
  if (view === 'summary') return <>模型名称中的峰谷时段与切换倒计时。</>;
  const band = bandPresentation(now, calendar.data), coverage = calendarCoverage(now, calendar.data);
  const currentName = band.band === 'peak' ? '峰时' : band.band === 'offpeak' ? '谷时' : '时段待核实';
  const nextName = band.next?.band === 'peak' ? '峰时' : '谷时';
  const day = chinaDay(now, calendar.data), segments = todaySegments(now, calendar.data);
  const position = day.hour / 24 * 100;
  const timeLabel = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
  const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`;
  const dayLabel = day.kind === 'weekend' ? '周末 · 全天谷时' : day.kind === 'holiday' ? '法定节假日 · 全天谷时' : day.kind === 'unverified' ? '节假日待核实' : '工作日';
  const calendarLabel = calendar.issue ? '本地日历存储异常' : coverage.expiresOn ? `已覆盖至 ${coverage.expiresOn}` : '当前年份待核实';
  return <div className="dtb-settings">
    <section className="dtb-status" aria-label="当前峰谷情况">
      <div className="dtb-status-heading"><strong data-band={prefs.colored ? band.band : 'plain'}>{currentName}</strong><span>北京时间 {timeLabel} · {dayLabel}</span></div>
      <div className="dtb-status-main">
        <div><span className="dtb-label">{band.next ? `距离进入${nextName}` : '下次切换时间待核实'}</span><div className="dtb-status-countdown" role="timer" aria-label="切换倒计时（时分秒）" aria-live="off">{band.next ? detailedCountdown(band.next.at - now) : '—:—:—'}</div></div>
        <div className="dtb-next-switch"><span className="dtb-label">下次切换 · 北京时间</span><span>{band.nextTime ?? '日历覆盖不足，暂不预测'}</span></div>
      </div>
      <div className="dtb-daytrack" data-colored={prefs.colored}>
        <div className="dtb-daytrack-plot" role="img" aria-label={`北京时间 ${timeLabel}，当前${currentName}。${segments.map(segment => `${hourLabel(segment.start)} 至 ${hourLabel(segment.end)} ${segment.band === 'peak' ? '峰时' : segment.band === 'offpeak' ? '谷时' : '待核实'}`).join('；')}`}>
          <div className="dtb-daytrack-now" style={{ left: `clamp(30px, ${position}%, calc(100% - 30px))` }}>现在</div>
          <div className="dtb-daytrack-bar">{segments.map(segment => <div key={segment.start} className={`dtb-daytrack-segment dtb-daytrack-${segment.band}`} style={{ width: `${(segment.end - segment.start) / 24 * 100}%` }} title={`${hourLabel(segment.start)}–${hourLabel(segment.end)} · ${segment.band === 'peak' ? '峰时' : segment.band === 'offpeak' ? '谷时' : '待核实'}`} />)}<span className="dtb-daytrack-cursor" style={{ left: `${position}%` }}><i /></span></div>
          <div className="dtb-daytrack-axis">{['00:00', '06:00', '12:00', '18:00', '24:00'].map(time => <span key={time}>{time}</span>)}</div>
        </div>
        <div className="dtb-daytrack-legend"><span>今日时段</span><span><i className="dtb-daytrack-offpeak" />谷时</span><span><i className="dtb-daytrack-peak" />峰时</span>{segments.some(segment => segment.band === 'unknown') && <span><i className="dtb-daytrack-unknown" />待核实</span>}</div>
      </div>
    </section>

    <DisplaySettings preferences={preferences} />

    <section className="dtb-reference" aria-label="价格与规则">
      <div className="dtb-section-heading"><h3>价格与规则</h3><span>按需展开</span></div>
      <div className="dtb-disclosures">
        <details className="dtb-disclosure" name="dtb-reference">
          <summary><span><strong>计费说明</strong><small>官方谷时单价为峰时的 50%</small></span><Chevron /></summary>
          <div className="dtb-disclosure-body">
            <p>以下为 DeepSeek 官方 API 参考价，单位：人民币 / 百万 Tokens。第三方渠道可能采用倍率、套餐或独立定价，以渠道账单为准。</p>
            <div className="dtb-price-cards">{priceCards.map(model => <div className="dtb-price-card" key={model.name}><table><caption>{model.name}</caption><thead><tr><th scope="col">项目</th><th scope="col" data-current={band.band === 'offpeak'}>谷时{band.band === 'offpeak' ? ' · 当前' : ''}</th><th scope="col" data-current={band.band === 'peak'}>峰时{band.band === 'peak' ? ' · 当前' : ''}</th></tr></thead><tbody>{model.rows.map(([item, offpeak, peak]) => <tr key={item}><th scope="row">{item}</th><td data-current={band.band === 'offpeak'}>¥{offpeak}</td><td data-current={band.band === 'peak'}>¥{peak}</td></tr>)}</tbody></table></div>)}</div>
            <dl className="dtb-definition"><dt>输入</dt><dd>每次请求发给模型的内容。缓存命中和未命中部分分别计价，不重复计算。</dd><dt>缓存命中</dt><dd>服务端复用的输入部分，单价更低，实际命中量由服务端返回。</dd><dt>输出</dt><dd>模型生成的 Token，按输出单价计费。</dd></dl>
            <p>费用 =（命中输入量 × 命中单价 + 未命中输入量 × 未命中单价 + 输出量 × 输出单价）÷ 1,000,000。</p>
            <p>例：Flash 的 10 万未命中输入 + 1 万输出，谷时约 ¥0.14，峰时约 ¥0.28；这是价格对比，不是本次会话账单。</p>
            <div className="dtb-source-row"><span>价格快照 · 核对于 2026-10-15</span><a href={CNY_PRICING_SOURCE} target="_blank" rel="noreferrer">官方最新价格 ↗</a></div>
            <p className="dtb-footnote">价格非实时同步；实际扣费及跨时段请求的结算以平台账单为准。</p>
          </div>
        </details>
        <details className="dtb-disclosure" name="dtb-reference">
          <summary><span><strong>峰谷规则</strong><small>北京时间 · 周末和法定节假日全天谷时</small></span><Chevron /></summary>
          <div className="dtb-disclosure-body">
            <dl className="dtb-definition"><dt>峰时</dt><dd>周一至周五 09:00–12:00、14:00–18:00，不含法定节假日。</dd><dt>谷时</dt><dd>其他时间，以及周末和法定节假日全天；调休周末仍按谷时。</dd><dt>倒计时</dt><dd>距下次峰谷切换的时间。设置页显示时、分、秒，模型名称仅显示时、分。</dd></dl>
            <p>这里只提供官方时段参考，不代表第三方渠道的价格；不修改模型、推理强度或实际扣费。</p>
          </div>
        </details>
        <details className="dtb-disclosure" name="dtb-reference">
          <summary><span><strong>日历与来源</strong><small>{calendarLabel}{calendar.update === 'failed' ? ' · 更新暂时失败' : ''}</small></span><Chevron /></summary>
          <div className="dtb-disclosure-body">
            <p>节假日日历{coverage.expiresOn ? `已覆盖至 ${coverage.expiresOn}` : '尚未覆盖当前年份'}。临近年末时自动补充下一年日历；资料不足时显示“待核实”，不推测倒计时。</p>
            {calendar.issue && <p role="alert">日历数据无法正常读取或保存，当前继续使用已加载的可用日历。</p>}
            {calendar.update === 'failed' && <p>本次更新失败，已保留现有日历，稍后自动重试。</p>}
            <div className="dtb-source-row"><a href={CNY_PRICING_SOURCE} target="_blank" rel="noreferrer">官方时段与价格 ↗</a><a href={calendar.data.source} target="_blank" rel="noreferrer">节假日来源 ↗</a></div>
          </div>
        </details>
      </div>
    </section>
  </div>;
}
