import { useLayoutEffect, useRef } from 'react';
import type { CalendarStore } from './calendar-store.ts';
import type { Preferences } from './preferences.ts';
import type { ModelStore } from './model-identity.ts';
import { mountModelLabels } from './model-label.ts';
export interface BindingProps {
  directory: ModelStore; preferences: Preferences; calendarStore: CalendarStore;
  clock: { getSnapshot(): number; subscribe(fn: () => void): () => void };
}
/** Session-scoped invisible marker in the native standardControls container.
 * It shares the exact directory used by ModelSelect and owns only that composer. */
export function ModelBinding(props: BindingProps) {
  const marker = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    // rc.2 wraps list slots in a display:contents div. ModelSelect lives
    // beside that wrapper, under this composer's standardControls.
    const root = marker.current?.closest<HTMLElement>('[class*="_standardControls"]');
    if (!root) return;
    return mountModelLabels({ document: root.ownerDocument, root, directory: props.directory,
      preferences: props.preferences, calendar: props.calendarStore, clock: props.clock });
  }, [props.directory, props.preferences, props.calendarStore, props.clock]);
  return <span ref={marker} hidden aria-hidden="true" data-peakclock-binding="" />;
}
