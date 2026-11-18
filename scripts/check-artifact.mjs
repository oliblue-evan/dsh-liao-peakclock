import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, mkdtemp, mkdir, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
const file = process.argv[2]; if (!file) throw new Error('Pass a packed .tgz path');
const expected = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const tarball = resolve(file), contents = execFileSync('tar',['-tzf',tarball],{encoding:'utf8'}).trim().split('\n');
assert.ok(contents.every(name => name.startsWith('package/') && !name.split('/').includes('..')));
assert.ok(contents.every(name => !name.endsWith('.ts') && !name.endsWith('.map')));
const temp = await mkdtemp(join(tmpdir(),'deepseek-time-pack-'));
try {
  execFileSync('tar',['-xzf',tarball,'-C',temp]);
  const pkgRoot = join(temp,'package'), pkg = JSON.parse(await readFile(join(pkgRoot,'package.json'),'utf8'));
  assert.equal(pkg.name,'dsh-liao-peakclock'); assert.equal(pkg.version, expected.version);
  assert.deepEqual(pkg.dsh.compatibility, expected.dsh.compatibility);
  await mkdir(join(temp,'node_modules')); await symlink(pkgRoot,join(temp,'node_modules',pkg.name),'dir');
  const require = createRequire(join(temp,'consumer.mjs'));
  const locale = JSON.parse(await readFile(require.resolve(`${pkg.name}/locale/zh.json`),'utf8'));
  assert.equal(locale.meta.title,'峰谷倒计时');
  for (const language of ['zh', 'en']) {
    const { meta } = JSON.parse(await readFile(require.resolve(`${pkg.name}/locale/${language}.json`), 'utf8'));
    const detail = await readFile(join(pkgRoot, meta.detail), 'utf8');
    assert.match(detail, new RegExp(`\\(preview\\.${language}\\.svg\\)`));
    const preview = await readFile(join(pkgRoot, 'docs', `preview.${language}.svg`), 'utf8');
    assert.match(preview, /width="640" height="300" viewBox="0 0 640 300"/);
    assert.doesNotMatch(preview, /75\s*%/);
  }
  assert.ok((await readFile(require.resolve(`${pkg.name}/${pkg.icon}`),'utf8')).includes('<svg'));
  const patch = await readFile(join(pkgRoot,'cordis.patch.yml'),'utf8'); assert.ok(patch.includes('id: peakclock')); assert.ok(patch.includes(`name: ${pkg.name}`));
  assert.equal(typeof (await import(pathToFileURL(require.resolve(pkg.name)).href)).apply,'function');
  let registration;
  vm.runInNewContext(await readFile(require.resolve(`${pkg.name}/client`),'utf8'),{window:{__ModuleLoader__:{load(value){registration=value;}}}});
  assert.equal(registration.id,pkg.name); assert.equal(typeof registration.factory,'function');
  assert.ok((await readFile(join(pkgRoot,'LICENSE'),'utf8')).includes('DSH TimeBand contributors'));
  console.log(JSON.stringify({package:pkg.name,version:pkg.version,files:contents.length,metadata:'resolved through exports',hostEntry:'loaded',client:'ModuleLoader registration valid'},null,2));
} finally { await rm(temp,{recursive:true,force:true}); }
