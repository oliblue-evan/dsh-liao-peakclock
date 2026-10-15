export interface ModelIdentity { id: string; name?: string; provider?: string }
export interface ModelState {
  current: { provider: string; model: string } | null;
  groups: readonly { id: string; models: readonly { id: string; name: string }[] }[];
}
export interface ModelStore { getSnapshot(): ModelState; subscribe(fn: () => void): () => void }
/** Provider namespaces may prefix the actual model id (e.g. channel/deepseek-*). */
export function isDeepSeek(value: string): boolean {
  return /^(?:[^/]+\/)*?deepseek(?=[\s/_-]|$)/i.test(value.trim());
}
/** Resolve only this composer's selected model, never the global default. */
export function selectedIdentity(state: ModelState): ModelIdentity | undefined {
  const selected = state.current;
  if (!selected) return undefined;
  const group = state.groups.find(item => item.id === selected.provider);
  const name = group?.models.find(item => item.id === selected.model)?.name;
  return { id: selected.model, provider: selected.provider, ...(name ? { name } : {}) };
}
