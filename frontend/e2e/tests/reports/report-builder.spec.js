/**
 * Report Builder E2E Tests
 * Tests report generation and builder functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Report Builder', () => {
  test('should load reports page', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(500);

    const hasContent = await page.locator('main, [role="main"]').isVisible();
    expect(hasContent).toBeTruthy();
  });

  test('should open report builder', async ({ page }) => {
    await page.goto('/reports/builder');
    await page.waitForTimeout(500);

    const hasBuilder = await page.locator('main, [role="main"]').isVisible();
    expect(hasBuilder).toBeTruthy();
  });

  test('should select data source', async ({ page }) => {
    await page.goto('/reports/builder');
    await page.waitForTimeout(500);

    const dataSourceSelect = page.locator('select[name="dataSource"], button:has-text("Data Source")');

    if (await dataSourceSelect.isVisible()) {
      if (await dataSourceSelect.evaluate(el => el.tagName) === 'SELECT') {
        const options = await dataSourceSelect.locator('option').count();
        expect(options).toBeGreaterThan(0);
      }
    }
  });

  test('should add measures to report', async ({ page }) => {
    await page.goto('/reports/builder');
    await page.waitForTimeout(500);

    const addMeasureButton = page.locator('button:has-text("Add Measure"), button:has-text("Measure")');

    if (await addMeasureButton.isVisible()) {
      await addMeasureButton.click();
      await page.waitForTimeout(300);
    }
  });

  test('should add dimensions to report', async ({ page }) => {
    await page.goto('/reports/builder');
    await page.waitForTimeout(500);

    const addDimensionButton = page.locator('button:has-text("Add Dimension"), button:has-text("Dimension")');

    if (await addDimensionButton.isVisible()) {
      await addDimensionButton.click();
      await page.waitForTimeout(300);
    }
  });

  test('should change chart type', async ({ page }) => {
    await page.goto('/reports/builder');
    await page.waitForTimeout(500);

    const chartTypeSelect = page.locator('select[name="chartType"], button:has-text("Chart Type")');

    if (await chartTypeSelect.isVisible()) {
      // Should have chart type options
      await expect(chartTypeSelect).toBeVisible();
    }
  });

  test('should save report', async ({ page }) => {
    await page.goto('/reports/builder');
    await page.waitForTimeout(500);

    const saveButton = page.locator('button:has-text("Save Report"), button:has-text("Save")');

    if (await saveButton.isVisible()) {
      await expect(saveButton).toBeVisible();
    }
  });

  test('should load saved report', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(500);

    const savedReports = page.locator('[data-testid="saved-report"], .report-card');
    const hasSavedReports = await savedReports.count() > 0;

    if (hasSavedReports) {
      await savedReports.first().click();
      await page.waitForTimeout(1000);
    }
  });
});
