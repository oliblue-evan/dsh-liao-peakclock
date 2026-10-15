import test from 'node:test';
import assert from 'node:assert/strict';
import { readStored } from '../src/storage.ts';
test('migration preserves legacy data and never overwrites the independent namespace', () => {
  const map = new Map([['legacy','old']]);
  const storage = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key,value); } };
  assert.equal(readStored(storage,'new','legacy'),'old'); assert.equal(map.get('legacy'),'old');
  map.set('new','accepted'); assert.equal(readStored(storage,'new','legacy'),'accepted');
  assert.equal(readStored({getItem: key => key === 'legacy' ? 'safe' : null, setItem() { throw new Error('quota'); }},'new','legacy'),'safe');
});

test('renaming migrates the most recent namespace before the original upstream namespace', () => {
  const values = new Map([['previous-package','recent'],['upstream','older']]);
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string,value: string) => { values.set(key,value); } };
  assert.equal(readStored(storage,'peakclock','previous-package','upstream'),'recent');
  assert.equal(values.get('peakclock'),'recent');
  values.set('previous-package','changed');
  assert.equal(readStored(storage,'peakclock','previous-package','upstream'),'recent');
});
