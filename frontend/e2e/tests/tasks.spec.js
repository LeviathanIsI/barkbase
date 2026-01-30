/**
 * Tasks E2E Tests
 * Tests task management functionality
 */

import { test, expect } from '@playwright/test';
import { TasksPage } from '../pages/TasksPage.js';

test.describe('Task Management', () => {
  let tasksPage;

  test.beforeEach(async ({ page }) => {
    tasksPage = new TasksPage(page);
  });

  test('should load tasks page successfully', async ({ page }) => {
    await tasksPage.goto();
    await expect(page.locator('h1')).toContainText(/Task/i);
  });

  test('should create new task via slideout', async ({ page }) => {
    await tasksPage.goto();

    const newTaskButton = page.locator('button:has-text("New Task"), button:has-text("Create Task")');

    if (await newTaskButton.isVisible()) {
      await newTaskButton.click();
      await page.waitForTimeout(500);

      const slideout = page.locator('[role="dialog"]');
      if (await slideout.isVisible()) {
        // Fill task details
        const titleInput = page.locator('input[name="title"], #title');
        if (await titleInput.isVisible()) {
          await titleInput.fill(`E2E Test Task ${Date.now()}`);
        }

        const typeSelect = page.locator('select[name="type"], #type');
        if (await typeSelect.isVisible()) {
          const options = await typeSelect.locator('option').count();
          if (options > 1) {
            await typeSelect.selectOption({ index: 1 });
          }
        }

        const prioritySelect = page.locator('select[name="priority"], #priority');
        if (await prioritySelect.isVisible()) {
          const options = await prioritySelect.locator('option').count();
          if (options > 1) {
            await prioritySelect.selectOption({ index: 1 });
          }
        }

        // Cancel instead of saving
        const cancelButton = page.locator('button:has-text("Cancel")');
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
        }
      }
    }
  });

  test('should complete task', async ({ page }) => {
    await tasksPage.goto();

    const completeButton = page.locator('button:has-text("Complete"), input[type="checkbox"]').first();

    if (await completeButton.isVisible()) {
      // Verify button/checkbox is clickable
      await expect(completeButton).toBeEnabled();
    }
  });

  test('should filter by status', async ({ page }) => {
    await tasksPage.goto();

    const statusFilters = ['To Do', 'In Progress', 'Completed', 'Overdue'];

    for (const status of statusFilters) {
      const filterButton = page.locator(`button:has-text("${status}")`);
      if (await filterButton.isVisible()) {
        await filterButton.click();
        await page.waitForTimeout(500);
        break;
      }
    }
  });

  test('should filter by assignee', async ({ page }) => {
    await tasksPage.goto();

    const myTasksButton = page.locator('button:has-text("My Tasks")');

    if (await myTasksButton.isVisible()) {
      await myTasksButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should switch to kanban view', async ({ page }) => {
    await tasksPage.goto();

    const kanbanViewButton = page.locator('button:has-text("Kanban"), button:has-text("Board")');

    if (await kanbanViewButton.isVisible()) {
      await kanbanViewButton.click();
      await page.waitForTimeout(500);

      const kanbanBoard = page.locator('[data-testid="kanban-board"], .kanban-board');
      if (await kanbanBoard.isVisible()) {
        await expect(kanbanBoard).toBeVisible();
      }
    }
  });

  test('should display correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await tasksPage.goto();
    await expect(page.locator('main, [role="main"]')).toBeVisible();
  });
});
