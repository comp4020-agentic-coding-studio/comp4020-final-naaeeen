import { test, expect, type Page } from '@playwright/test';

// Inert foreground layers allow click-through, so DOM visibility alone cannot
// prove a dialog is painted. Inspect its actual light paper surface in native PNGs.
async function paintedTitleDialog(page: Page) {
  const box = await page.locator('#panel').boundingBox();
  if (!box) throw new Error('The open title dialog needs a rendered rectangle.');
  const png = await page.screenshot({ animations: 'disabled' });
  const brightness = await page.evaluate(async ({ bytes, box }) => {
    const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/png' }));
    const surface = new OffscreenCanvas(bitmap.width, bitmap.height), context = surface.getContext('2d');
    if (!context) throw new Error('Native screenshot inspection needs a 2D context.');
    try {
      context.drawImage(bitmap, 0, 0);
      return [[box.x + 12, box.y + 30], [box.x + box.width - 12, box.y + 30],
        [box.x + 12, box.y + box.height - 30], [box.x + box.width - 12, box.y + box.height - 30]]
        .map(([x, y]) => { const pixel = context.getImageData(Math.floor(x), Math.floor(y), 1, 1).data; return (pixel[0]! + pixel[1]! + pixel[2]!) / 3; });
    } finally { bitmap.close(); }
  }, { bytes: [...png], box });
  expect(brightness.every(value => value > 150)).toBe(true);
}

for (const viewport of [{ width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
  test(`title dialogs are visible and usable at ${viewport.width}x${viewport.height}`, async ({ browser }, info) => {
    const context = await browser.newContext({ viewport });
    try {
      const page = await context.newPage();
      await page.goto('/');
      await page.locator('#title-screen').getByRole('button', { name: 'Options', exact: true }).click();
      await page.getByRole('checkbox', { name: 'Reduce camera motion', exact: true }).check();
      await expect(page.getByRole('checkbox', { name: 'Reduce camera motion', exact: true })).toBeChecked();
      await page.screenshot({ path: info.outputPath('title-options.png'), animations: 'disabled' });
      await paintedTitleDialog(page);
      await page.getByRole('button', { name: 'Close panel', exact: true }).click();
      await page.locator('#title-screen').getByRole('button', { name: 'About', exact: true }).click();
      await expect(page.locator('#panel .readme-link')).toBeVisible();
      await page.screenshot({ path: info.outputPath('title-about.png'), animations: 'disabled' });
      await paintedTitleDialog(page);
      const link = page.locator('#panel .readme-link'), box = await link.boundingBox();
      if (!box) throw new Error('The title About link must be rendered.');
      expect(await link.evaluate((element, point) => element.contains(document.elementFromPoint(point.x, point.y)),
        { x: box.x + box.width / 2, y: box.y + box.height / 2 })).toBe(true);
      await page.getByRole('button', { name: 'Close panel', exact: true }).click();
      await expect(page.locator('#title-screen')).toBeVisible();
      await expect(page.locator('#panel')).toBeHidden();
      await page.screenshot({ path: info.outputPath('title-dialog-return.png'), animations: 'disabled' });
    } finally { await context.close(); }
  });
}
