/** Read the new namespace first; migrate legacy data once without deleting it.
 * A failed copy still leaves the original readable, and a future load retries. */
export function readStored(storage: Pick<Storage, 'getItem' | 'setItem'>, key: string, ...legacyKeys: string[]): string | null {
  const own = storage.getItem(key);
  if (own !== null) return own;
  for (const legacyKey of legacyKeys) {
    const legacy = storage.getItem(legacyKey);
    if (legacy !== null) { try { storage.setItem(key, legacy); } catch {} return legacy; }
  }
  return null;
}
