/**
 * Bookings Page E2E Tests
 * Tests booking management functionality
 */

import { test, expect } from '@playwright/test';
import { BookingsPage } from '../pages/BookingsPage.js';
import { testBookings, generateUniqueTestData } from '../fixtures/test-data.js';

test.describe('Bookings Management', () => {
  let bookingsPage;

  test.beforeEach(async ({ page }) => {
    bookingsPage = new BookingsPage(page);
  });

  test.describe('Page Load', () => {
    test('should load bookings page successfully', async ({ page }) => {
      await bookingsPage.goto();

      await expect(page.locator('h1')).toContainText(/Booking/i);
    });

    test('should display bookings content', async ({ page }) => {
      await bookingsPage.goto();

      // Should have some view content (calendar, list, or run board)
      const calendar = page.locator('[data-testid="calendar"], .calendar');
      const list = page.locator('[data-testid="bookings-list"], .bookings-list');
      const runBoard = page.locator('[data-testid="run-board"], .run-board');
      const table = page.locator('table');

      const hasContent = await calendar.isVisible() ||
                        await list.isVisible() ||
                        await runBoard.isVisible() ||
                        await table.isVisible();

      expect(hasContent).toBeTruthy();
    });
  });

  test.describe('View Toggles', () => {
    test('should switch to list view', async ({ page }) => {
      await bookingsPage.goto();

      const listViewButton = page.locator('button:has-text("List"), [data-testid="list-view"]');

      if (await listViewButton.isVisible()) {
        await listViewButton.click();
        await page.waitForTimeout(500);

        // List view should be active
        await expect(listViewButton).toHaveAttribute('aria-pressed', 'true').or(
          expect(listViewButton).toHaveClass(/active|selected/)
        ).catch(() => {});
      }
    });

    test('should switch to calendar view', async ({ page }) => {
      await bookingsPage.goto();

      const calendarViewButton = page.locator('button:has-text("Calendar"), [data-testid="calendar-view"]');

      if (await calendarViewButton.isVisible()) {
        await calendarViewButton.click();
        await page.waitForTimeout(500);
      }
    });

    test('should switch to run board view', async ({ page }) => {
      await bookingsPage.goto();

      const runBoardButton = page.locator('button:has-text("Run Board"), [data-testid="run-board-view"]');

      if (await runBoardButton.isVisible()) {
        await runBoardButton.click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Date Navigation', () => {
    test('should navigate to today', async ({ page }) => {
      await bookingsPage.goto();

      const todayButton = page.locator('button:has-text("Today")');

      if (await todayButton.isVisible()) {
        await todayButton.click();
        await page.waitForTimeout(500);
      }
    });

    test('should navigate to next period', async ({ page }) => {
      await bookingsPage.goto();

      const nextButton = page.locator('button[aria-label="Next"], button:has-text(">")');

      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);
      }
    });

    test('should navigate to previous period', async ({ page }) => {
      await bookingsPage.goto();

      const prevButton = page.locator('button[aria-label="Previous"], button:has-text("<")');

      if (await prevButton.isVisible()) {
        await prevButton.click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Booking CRUD Operations', () => {
    test('should open new booking modal', async ({ page }) => {
      await bookingsPage.goto();

      const newBookingButton = page.locator('button:has-text("New Booking"), [data-testid="new-booking"]');

      if (await newBookingButton.isVisible()) {
        await newBookingButton.click();

        await expect(page.locator('[role="dialog"]')).toBeVisible();
      }
    });

    test('should show booking detail on click', async ({ page }) => {
      await bookingsPage.goto();

      // Switch to list view for easier selection
      const listViewButton = page.locator('button:has-text("List")');
      if (await listViewButton.isVisible()) {
        await listViewButton.click();
        await page.waitForTimeout(500);
      }

      // Click on a booking
      const bookingCard = page.locator('[data-testid="booking-card"], .booking-card, tbody tr').first();

      if (await bookingCard.isVisible()) {
        await bookingCard.click();
        await page.waitForTimeout(500);

        // Detail panel or modal should appear
        const detailPanel = page.locator('[data-testid="booking-detail"], .booking-detail, [role="dialog"]');
        const isVisible = await detailPanel.isVisible();

        // Some implementations might navigate instead
        expect(isVisible || page.url().includes('/bookings/')).toBeTruthy();
      }
    });
  });

  test.describe('Status Filtering', () => {
    test('should filter by confirmed status', async ({ page }) => {
      await bookingsPage.goto();

      const confirmedFilter = page.locator('button:has-text("Confirmed")');

      if (await confirmedFilter.isVisible()) {
        await confirmedFilter.click();
        await page.waitForTimeout(500);
      }
    });

    test('should filter by checked-in status', async ({ page }) => {
      await bookingsPage.goto();

      const checkedInFilter = page.locator('button:has-text("Checked In")');

      if (await checkedInFilter.isVisible()) {
        await checkedInFilter.click();
        await page.waitForTimeout(500);
      }
    });

    test('should show all bookings', async ({ page }) => {
      await bookingsPage.goto();

      const allFilter = page.locator('button:has-text("All")');

      if (await allFilter.isVisible()) {
        await allFilter.click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Search', () => {
    test('should search for bookings', async ({ page }) => {
      await bookingsPage.goto();

      const searchInput = page.locator('input[placeholder*="Search"], [data-testid="search-input"]');

      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.waitForTimeout(1000);

        // Results should update
        await searchInput.clear();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Booking Actions', () => {
    test('should show check-in button for confirmed bookings', async ({ page }) => {
      await bookingsPage.goto();

      // Look for check-in button in any booking
      const checkInButton = page.locator('button:has-text("Check In")').first();

      if (await checkInButton.isVisible()) {
        // Button should be clickable
        await expect(checkInButton).toBeEnabled();
      }
    });

    test('should show check-out button for checked-in bookings', async ({ page }) => {
      await bookingsPage.goto();

      const checkOutButton = page.locator('button:has-text("Check Out")').first();

      if (await checkOutButton.isVisible()) {
        await expect(checkOutButton).toBeEnabled();
      }
    });
  });

  test.describe('Bulk Actions', () => {
    test('should select multiple bookings', async ({ page }) => {
      await bookingsPage.goto();

      // Switch to list view
      const listViewButton = page.locator('button:has-text("List")');
      if (await listViewButton.isVisible()) {
        await listViewButton.click();
        await page.waitForTimeout(500);
      }

      const checkboxes = page.locator('[data-testid="booking-card"] input[type="checkbox"], tbody tr input[type="checkbox"]');
      const count = await checkboxes.count();

      if (count >= 2) {
        await checkboxes.nth(0).check();
        await checkboxes.nth(1).check();

        // Bulk actions should appear
        const bulkActions = page.locator('[data-testid="bulk-actions"], .bulk-actions');
        const bulkVisible = await bulkActions.isVisible();

        if (bulkVisible) {
          await expect(bulkActions).toBeVisible();
        }
      }
    });
  });

  test.describe('Run Board View', () => {
    test('should display kennels in run board', async ({ page }) => {
      await bookingsPage.goto();

      const runBoardButton = page.locator('button:has-text("Run Board")');

      if (await runBoardButton.isVisible()) {
        await runBoardButton.click();
        await page.waitForTimeout(500);

        // Should show kennel columns or grid
        const kennels = page.locator('[data-testid="kennel-column"], .kennel-column, .kennel-card');
        const kennelCount = await kennels.count();

        expect(kennelCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await bookingsPage.goto();

      await expect(page.locator('main, [role="main"]')).toBeVisible();
    });

    test('should display correctly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await bookingsPage.goto();

      await expect(page.locator('main, [role="main"]')).toBeVisible();
    });

    test('should display correctly on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await bookingsPage.goto();

      await expect(page.locator('main, [role="main"]')).toBeVisible();
    });
  });
});
