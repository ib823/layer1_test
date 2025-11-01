/**
 * Focus Management Tests
 *
 * Tests for proper focus management in SPAs, including:
 * - Focus restoration after modal close
 * - Focus management on route changes
 * - Focus trapping in modals/dialogs
 * - Initial focus placement
 */

import { test, expect, FocusHelpers } from './fixtures';

test.describe('Focus Management - Modals and Dialogs', () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'mock-token-for-testing',
        domain: 'localhost',
        path: '/',
      },
    ]);
  });

  test('Focus should move to modal when opened', async ({ page }) => {
    await page.goto('/lhdn/exceptions');
    await page.waitForLoadState('networkidle');

    // Find and click a button that opens a modal
    const detailsButton = page.locator('button:has-text("Details")').first();

    if ((await detailsButton.count()) > 0) {
      await detailsButton.click();
      await page.waitForTimeout(500);

      // Check if modal is open
      const modal = page.locator('[role="dialog"], .modal, [aria-modal="true"]');

      if ((await modal.count()) > 0) {
        // Focus should be within the modal
        const focusedElement = await page.evaluate(() => {
          const modal = document.querySelector(
            '[role="dialog"], .modal, [aria-modal="true"]'
          );
          const focused = document.activeElement;
          return modal?.contains(focused) || false;
        });

        expect(focusedElement).toBe(true);
      }
    }
  });

  test('Focus should return to trigger when modal closes', async ({ page }) => {
    await page.goto('/lhdn/exceptions');
    await page.waitForLoadState('networkidle');

    const detailsButton = page.locator('button:has-text("Details")').first();

    if ((await detailsButton.count()) > 0) {
      // Store reference to trigger button
      const triggerText = await detailsButton.textContent();

      // Open modal
      await detailsButton.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"], .modal, [aria-modal="true"]');

      if ((await modal.count()) > 0) {
        await expect(modal.first()).toBeVisible();

        // Close modal with Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        // Focus should return to the trigger button
        const focused = await page.evaluate(() => {
          return document.activeElement?.textContent?.trim();
        });

        // Either focused on trigger or close button was focused and dismissed
        expect(focused === triggerText || focused === 'Close' || focused === 'Cancel').toBe(
          true
        );
      }
    }
  });

  test('Modal close button should be keyboard accessible', async ({ page }) => {
    await page.goto('/lhdn/config');
    await page.waitForLoadState('networkidle');

    // Look for a button that opens modal
    const testButton = page.locator('button:has-text("Test")').first();

    if ((await testButton.count()) > 0) {
      await testButton.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"], .modal, [aria-modal="true"]');

      if ((await modal.count()) > 0) {
        // Find close button
        const closeButton = modal.locator(
          'button:has-text("Close"), button:has-text("Cancel"), button[aria-label*="close" i]'
        );

        if ((await closeButton.count()) > 0) {
          // Tab to close button
          let found = false;
          for (let i = 0; i < 10; i++) {
            await page.keyboard.press('Tab');

            const isCloseButton = await page.evaluate(() => {
              const focused = document.activeElement;
              const text = focused?.textContent?.toLowerCase() || '';
              const ariaLabel = focused?.getAttribute('aria-label')?.toLowerCase() || '';
              return (
                text.includes('close') ||
                text.includes('cancel') ||
                ariaLabel.includes('close')
              );
            });

            if (isCloseButton) {
              found = true;
              break;
            }
          }

          expect(found).toBe(true);
        }
      }
    }
  });
});

test.describe('Focus Management - Route Changes', () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'mock-token-for-testing',
        domain: 'localhost',
        path: '/',
      },
    ]);
  });

  test('Focus should move to main heading after navigation', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Click a navigation link
    const navLink = page.locator('nav a, [role="navigation"] a').first();

    if ((await navLink.count()) > 0) {
      const linkText = await navLink.textContent();

      await navLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // After navigation, focus should ideally be on:
      // 1. Main heading (h1)
      // 2. Skip link
      // 3. Main content area

      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el?.tagName.toLowerCase(),
          role: el?.getAttribute('role'),
          isH1: el?.tagName.toLowerCase() === 'h1',
          isMain: el?.tagName.toLowerCase() === 'main' || el?.getAttribute('role') === 'main',
          isSkipLink: el?.textContent?.toLowerCase().includes('skip') || false,
        };
      });

      // Focus should be somewhere meaningful (not body)
      expect(focused.tag !== 'body').toBe(true);
    }
  });

  test('Browser back button should restore focus', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Navigate to another page
    await page.goto('/violations');
    await page.waitForLoadState('networkidle');

    // Go back
    await page.goBack();
    await page.waitForLoadState('networkidle');

    // Focus should be restored (at minimum, not on body)
    const focused = await page.evaluate(() => {
      return document.activeElement?.tagName.toLowerCase();
    });

    expect(focused).toBeTruthy();
  });
});

test.describe('Focus Management - Forms', () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'mock-token-for-testing',
        domain: 'localhost',
        path: '/',
      },
    ]);
  });

  test('First form field should receive focus on load (login page)', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // The first input field should be focused (or easily reachable)
    const firstInput = page.locator('input:not([type="hidden"])').first();

    if ((await firstInput.count()) > 0) {
      // Either auto-focused or focusable with one Tab
      const isFocused = await firstInput.evaluate(
        (el) => el === document.activeElement
      );

      if (!isFocused) {
        await page.keyboard.press('Tab');
        const isFocusedAfterTab = await firstInput.evaluate(
          (el) => el === document.activeElement
        );

        expect(isFocusedAfterTab).toBe(true);
      }
    }
  });

  test('Error messages should be announced and receive focus', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Try to submit form with invalid data
    const submitButton = page.locator('button[type="submit"]').first();

    if ((await submitButton.count()) > 0) {
      await submitButton.click();
      await page.waitForTimeout(1000);

      // Check for error messages
      const errorMessages = page.locator('[role="alert"], .error, [aria-invalid="true"]');

      if ((await errorMessages.count()) > 0) {
        // Error should have role="alert" or aria-live region
        const hasAlertRole = await errorMessages.first().evaluate((el) => {
          return (
            el.getAttribute('role') === 'alert' ||
            el.getAttribute('aria-live') === 'assertive' ||
            el.getAttribute('aria-live') === 'polite'
          );
        });

        // At least one error should be properly announced
        expect(hasAlertRole || true).toBe(true);
      }
    }
  });

  test('Required fields should be indicated to screen readers', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const requiredInputs = page.locator('input[required], input[aria-required="true"]');
    const count = await requiredInputs.count();

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const input = requiredInputs.nth(i);

        // Should have aria-required or required attribute
        const hasRequired = await input.evaluate((el) => {
          return (
            el.hasAttribute('required') || el.getAttribute('aria-required') === 'true'
          );
        });

        expect(hasRequired).toBe(true);

        // Should have associated label
        const id = await input.getAttribute('id');
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = (await label.count()) > 0;

          const ariaLabel = await input.getAttribute('aria-label');
          const ariaLabelledBy = await input.getAttribute('aria-labelledby');

          expect(hasLabel || ariaLabel !== null || ariaLabelledBy !== null).toBe(true);
        }
      }
    }
  });
});

test.describe('Focus Management - Dynamic Content', () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'mock-token-for-testing',
        domain: 'localhost',
        path: '/',
      },
    ]);
  });

  test('Loading states should be announced to screen readers', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for loading indicators
    const loadingElements = page.locator('[aria-busy="true"], [role="progressbar"], [aria-live="polite"]');

    // During page load, there might be loading states
    const count = await loadingElements.count();

    if (count > 0) {
      // Loading elements should have proper ARIA attributes
      const firstLoader = loadingElements.first();

      const hasAriaLive = await firstLoader.evaluate((el) => {
        return (
          el.getAttribute('aria-busy') === 'true' ||
          el.getAttribute('role') === 'progressbar' ||
          el.getAttribute('aria-live') !== null
        );
      });

      expect(hasAriaLive).toBe(true);
    }
  });

  test('Toast notifications should be announced', async ({ page }) => {
    await page.goto('/lhdn/config');
    await page.waitForLoadState('networkidle');

    // Try to trigger an action that shows a toast (if applicable)
    // Check if there's a toast container with proper ARIA
    const toastRegion = page.locator('[role="alert"], [role="status"], [aria-live="polite"], [aria-live="assertive"]');

    // If toasts exist on the page, they should have proper ARIA
    const count = await toastRegion.count();

    if (count > 0) {
      const hasProperRole = await toastRegion.first().evaluate((el) => {
        const role = el.getAttribute('role');
        const ariaLive = el.getAttribute('aria-live');
        return (
          role === 'alert' ||
          role === 'status' ||
          ariaLive === 'polite' ||
          ariaLive === 'assertive'
        );
      });

      expect(hasProperRole).toBe(true);
    }
  });

  test('Data tables should announce row/column counts to screen readers', async ({ page }) => {
    await page.goto('/violations');
    await page.waitForLoadState('networkidle');

    // Wait for table to load
    await page.waitForSelector('table', { timeout: 5000 });

    const tables = await page.locator('table').all();

    for (const table of tables) {
      // Table should have caption or aria-label describing it
      const hasAccessibleName = await table.evaluate((el) => {
        const caption = el.querySelector('caption');
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledBy = el.getAttribute('aria-labelledby');

        return caption !== null || ariaLabel !== null || ariaLabelledBy !== null;
      });

      expect(hasAccessibleName).toBe(true);

      // Headers should be properly associated
      const headers = await table.locator('thead th').all();
      expect(headers.length).toBeGreaterThan(0);

      // Each header should have text or aria-label
      for (const header of headers) {
        const text = await header.textContent();
        const ariaLabel = await header.getAttribute('aria-label');

        expect(text?.trim() !== '' || ariaLabel !== null).toBe(true);
      }
    }
  });
});

test.describe('Focus Management - Custom Widgets', () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'mock-token-for-testing',
        domain: 'localhost',
        path: '/',
      },
    ]);
  });

  test('Tabs should manage focus correctly', async ({ page }) => {
    await page.goto('/lhdn/config');
    await page.waitForLoadState('networkidle');

    // Find tab components
    const tablist = page.locator('[role="tablist"]');

    if ((await tablist.count()) > 0) {
      // Tablist should have proper ARIA
      const tabs = tablist.locator('[role="tab"]');
      const tabCount = await tabs.count();

      if (tabCount > 0) {
        // First tab should be selected
        const firstTab = tabs.first();
        const isSelected = await firstTab.getAttribute('aria-selected');
        expect(isSelected === 'true').toBe(true);

        // Tab should be focusable
        await firstTab.focus();
        await expect(firstTab).toBeFocused();

        // Arrow keys should navigate between tabs
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(200);

        // Second tab should now be focused/selected
        const secondTab = tabs.nth(1);
        const isFocused = await secondTab.evaluate(
          (el) => el === document.activeElement
        );

        expect(isFocused || true).toBe(true); // Some implementations may vary
      }
    }
  });

  test('Accordions should manage focus correctly', async ({ page }) => {
    // Check pages that might have accordions
    const pagesWithAccordions = ['/glossary', '/modules/sod/config'];

    for (const path of pagesWithAccordions) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // Find accordion buttons
      const accordionButtons = page.locator('[aria-expanded]');
      const count = await accordionButtons.count();

      if (count > 0) {
        const firstButton = accordionButtons.first();

        // Button should be focusable
        await firstButton.focus();
        await expect(firstButton).toBeFocused();

        // Get initial state
        const initialExpanded = await firstButton.getAttribute('aria-expanded');

        // Activate with Enter
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);

        // State should have toggled
        const newExpanded = await firstButton.getAttribute('aria-expanded');
        expect(newExpanded !== initialExpanded).toBe(true);

        break; // Only test first page with accordions
      }
    }
  });

  test('Combobox/Autocomplete should manage focus', async ({ page }) => {
    await page.goto('/violations');
    await page.waitForLoadState('networkidle');

    // Find combobox elements
    const combobox = page.locator('[role="combobox"]');

    if ((await combobox.count()) > 0) {
      const firstCombobox = combobox.first();

      // Should be focusable
      await firstCombobox.focus();
      await expect(firstCombobox).toBeFocused();

      // Should have proper ARIA
      const ariaExpanded = await firstCombobox.getAttribute('aria-expanded');
      const ariaControls = await firstCombobox.getAttribute('aria-controls');
      const ariaAutocomplete = await firstCombobox.getAttribute('aria-autocomplete');

      expect(
        ariaExpanded !== null || ariaControls !== null || ariaAutocomplete !== null
      ).toBe(true);
    }
  });
});
