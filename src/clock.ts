/** One owned clock: minute-aligned normally, second-aligned while a live status
 * view subscribes. Hidden pages stop; waking always re-reads wall time. */
export function createClock() {
  let snapshot = Date.now(), running = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>(), seconds = new Set<() => void>();
  const update = () => {
    snapshot = Date.now();
    for (const listener of [...listeners, ...seconds]) listener();
  };
  const arm = () => {
    clearTimeout(timer); timer = undefined;
    if (!running || document.visibilityState === 'hidden') return;
    const unit = seconds.size ? 1000 : 60_000;
    timer = setTimeout(() => { update(); arm(); }, unit - Date.now() % unit);
  };
  const resume = () => { if (running) { update(); arm(); } };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    subscribeSeconds(listener: () => void) {
      seconds.add(listener); resume();
      return () => { seconds.delete(listener); if (running) arm(); };
    },
    start() {
      running = true;
      document.addEventListener('visibilitychange', resume);
      window.addEventListener('focus', resume);
      window.addEventListener('pageshow', resume);
      resume();
      return () => {
        running = false; clearTimeout(timer); timer = undefined;
        document.removeEventListener('visibilitychange', resume);
        window.removeEventListener('focus', resume);
        window.removeEventListener('pageshow', resume);
      };
    },
  };
}
