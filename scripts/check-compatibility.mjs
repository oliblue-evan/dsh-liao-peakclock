import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const target = manifest.peerDependencies['@deepseek-ai/dsh'];
// Verify the declared target, not the mutable npm latest release.
for (const name of ['@deepseek-ai/dsh-client-ui-renderer', '@deepseek-ai/dsh-client-ui-plugin-manager', '@deepseek-ai/dsh-client-ui-model-selection', '@deepseek-ai/dsh-client-ui-conversation', '@deepseek-ai/dsh-client-ui-slots']) {
  assert.equal(manifest.devDependencies[name], target, `${name} must be pinned to ${target}`);
  const installed = JSON.parse(await readFile(new URL(`../node_modules/${name}/package.json`, import.meta.url), 'utf8'));
  assert.equal(installed.version, target);
}
console.log(`Exact host fixtures match ${target}; no network or host upgrade performed.`);
