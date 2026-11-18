import { test, expect } from '@playwright/test';
const caption = '.fixture-native .dtb-caption';
test.beforeEach(async ({ page }) => { await page.goto('/'); await expect(page.locator(caption)).toContainText('DS4.1F'); });
test('model ID handles aliases and rejects a misleading non-DeepSeek name', async ({ page }) => {
  await expect(page.locator(caption)).toContainText('峰 0:01');
  await page.getByRole('button', { name: '非 DeepSeek ID', exact: true }).click();
  await expect(page.locator(caption)).toHaveCount(0);
  await page.getByRole('button', { name: 'DeepSeek 别名模型', exact: true }).click();
  await expect(page.locator(caption)).toContainText('DS4.1F');
  await page.getByRole('button', { name: '选择模型：主力模型', exact: true }).click();
  await expect(page.getByText('原生菜单点击仍有效', { exact: true })).toBeVisible();
});
test('appearance presets preserve disabled state; settings and real caption agree after reenable', async ({ page }) => {
  const enabled = page.getByRole('switch', { name: '启用峰谷提示', exact: true });
  await enabled.uncheck(); await page.getByRole('button', { name: '完整', exact: true }).click();
  await expect(enabled).not.toBeChecked(); await expect(page.locator(caption)).toHaveCount(0);
  await enabled.check(); await expect(page.locator(`${caption} [data-appearance="badge"]`)).toContainText('峰时');
  await expect(page.locator('.dtb-sample [data-appearance="badge"]')).toHaveCount(2);
});
test('boundary changes remain live while a reference disclosure stays open', async ({ page }) => {
  await page.locator('.dtb-disclosure').first().locator('summary').click();
  await page.getByRole('button', { name: '切换到 12:00', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText('2:00:00');
  await expect(page.locator(caption)).toContainText('谷 2:00');
  await expect(page.locator('.dtb-disclosure').first()).toHaveAttribute('open', '');
});
test('unload restores the native label and repeated reload owns exactly one style and caption', async ({ page }) => {
  for (let cycle = 0; cycle < 2; cycle++) {
    await page.getByRole('button', { name: '卸载插件', exact: true }).click();
    await expect(page.locator(caption)).toHaveCount(0); await expect(page.locator('style[data-plugin="dsh-liao-peakclock"]')).toHaveCount(0);
    await expect(page.locator('.fixture_triggerLabel')).toBeVisible();
    await page.getByRole('button', { name: '加载插件', exact: true }).click();
    await expect(page.locator(caption)).toHaveCount(1); await expect(page.locator('style[data-plugin="dsh-liao-peakclock"]')).toHaveCount(1);
  }
});
test('compact settings fit a narrow screen and a complete preset persists across reload', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 900 });
  await page.getByRole('button', { name: '完整', exact: true }).click();
  await page.reload(); await expect(page.getByRole('button', { name: '完整', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.locator('.dtb-preferences').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
});

test('default assembled semantic snapshot', async ({ page }) => {
  const result = await page.locator('.dtb-settings').evaluate(element => ({
    sections: [...element.querySelectorAll('section')].map(section => section.getAttribute('aria-label')),
    selects: [...element.querySelectorAll('select')].map(select => select.value),
    segments: [...element.querySelectorAll('[role=group]')].map(group => ({label:group.getAttribute('aria-label'), selected:group.querySelector('[aria-pressed=true]')?.textContent??null})),
    moreOpen: element.querySelector('.dtb-display-more')?.hasAttribute('open'),
    switches: [...element.querySelectorAll('input[role="switch"]')].map(input => (input as HTMLInputElement).checked),
    preview: [...element.querySelectorAll('.dtb-preview-example .dtb-caption')].map(caption => caption.textContent),
    references: [...element.querySelectorAll('.dtb-disclosure')].map(item => (item as HTMLDetailsElement).open),
  }));
  expect(JSON.stringify(Object.fromEntries(Object.entries(result).sort(([a],[b]) => a.localeCompare(b))), null, 2) + '\n').toMatchSnapshot('default-semantic.json');
});

test('settings switch and surfaces follow DSH theme tokens in both states', async ({ page }) => {
  const settings = page.locator('.dtb-settings');
  const toggle = page.getByRole('switch', { name: '启用峰谷提示', exact: true });
  const palette = (colors: Record<string, string>) => settings.evaluate((element, values) => {
    for (const [key, value] of Object.entries(values)) (element as HTMLElement).style.setProperty(key, value);
  }, colors);
  await palette({
    '--dsw-alias-brand-primary': 'rgb(249, 250, 251)',
    '--dsw-alias-label-primary-foreground': 'rgb(15, 17, 21)',
    '--dsw-alias-bg-layer-1': 'rgb(35, 35, 35)',
  });
  await expect(toggle).toHaveCSS('width', '36px');
  await expect(toggle).toHaveCSS('height', '20px');
  await expect(toggle).toHaveCSS('border-radius', '999px');
  await expect(toggle).toHaveCSS('background-color', 'rgb(249, 250, 251)');
  await expect(settings.locator('.dtb-status')).toHaveCSS('background-color', 'rgb(35, 35, 35)');
  await expect.poll(() => toggle.evaluate(element => getComputedStyle(element, '::after').backgroundColor)).toBe('rgb(15, 17, 21)');

  await palette({
    '--dsw-alias-brand-primary': 'rgb(15, 17, 21)',
    '--dsw-alias-label-primary-foreground': 'rgb(249, 250, 251)',
    '--dsw-alias-bg-layer-1': 'rgb(246, 247, 249)',
    '--dsw-alias-border-l3': 'rgb(226, 228, 232)',
    '--dsw-alias-switch-thumb': 'rgb(110, 115, 123)',
  });
  await expect(settings.locator('.dtb-status')).toHaveCSS('background-color', 'rgb(246, 247, 249)');
  await expect(toggle).toHaveCSS('background-color', 'rgb(15, 17, 21)');
  await toggle.uncheck();
  await expect(toggle).toHaveCSS('background-color', 'rgb(226, 228, 232)');
  await expect.poll(() => toggle.evaluate(element => getComputedStyle(element, '::after').backgroundColor)).toBe('rgb(110, 115, 123)');
});

test('near countdown hides distant transitions; official-only excludes third-party providers and disabling hides controls', async ({page}) => {
  await page.getByRole('button',{name:'临近切换',exact:true}).click();
  await expect(page.locator(caption)).toContainText('0:01');
  await page.getByRole('button',{name:'切换到 12:00',exact:true}).click();
  await expect(page.locator(caption)).toHaveText('DS4.1F · 谷');
  await expect(page.getByRole('timer')).toHaveText('2:00:00');
  await expect(page.locator('.dtb-sample')).toContainText('0:20');
  await page.locator('.dtb-display-more summary').click();
  await page.getByRole('button',{name:'仅官方来源',exact:true}).click();
  await expect(page.locator(caption)).toHaveCount(0);
  await page.getByRole('button',{name:'所有 DeepSeek',exact:true}).click();
  await expect(page.locator(caption)).toContainText('DS4.1F');
  await page.getByRole('switch',{name:'启用峰谷提示',exact:true}).uncheck();
  await expect(page.getByRole('group',{name:'模型名称',exact:true})).toHaveCount(0);
  await expect(page.getByRole('timer')).toHaveText('2:00:00');
});
