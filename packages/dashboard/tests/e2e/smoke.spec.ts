import { test, expect } from '@playwright/test';

test('sessions page loads', async ({ page }) => {
  await page.goto('/sessions');
  await expect(page.getByText('CausalFunnel Analytics')).toBeVisible();
  await expect(page.locator('text=Total sessions').first()).toBeVisible();
});

test('heatmap page loads', async ({ page }) => {
  await page.goto('/heatmap');
  await expect(page.getByText('Page', { exact: false })).toBeVisible();
});
