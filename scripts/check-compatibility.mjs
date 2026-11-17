import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const target = manifest.peerDependencies['@deepseek-ai/dsh'];
// Peer ranges are the compatibility contract; the dev fixtures are pinned to the
// range floor so rendering baselines stay reproducible instead of chasing npm latest.
const floor = /^>=(\S+) </.exec(target)?.[1];
assert.ok(floor, `@deepseek-ai/dsh peer range must start with a lower bound: ${target}`);
// Verify the declared floor, not the mutable npm latest release.
for (const name of ['@deepseek-ai/dsh-client-ui-renderer', '@deepseek-ai/dsh-client-ui-plugin-manager', '@deepseek-ai/dsh-client-ui-model-selection', '@deepseek-ai/dsh-client-ui-conversation', '@deepseek-ai/dsh-client-ui-slots']) {
  assert.equal(manifest.devDependencies[name], floor, `${name} must be pinned to ${floor}`);
  const installed = JSON.parse(await readFile(new URL(`../node_modules/${name}/package.json`, import.meta.url), 'utf8'));
  assert.equal(installed.version, floor);
}
console.log(`Exact host fixtures match the ${target} floor (${floor}); no network or host upgrade performed.`);
