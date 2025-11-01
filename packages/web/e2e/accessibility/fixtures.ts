/**
 * Accessibility Testing Fixtures
 *
 * Shared utilities and helpers for accessibility testing with Playwright and axe-core
 */

import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Extended test with accessibility helpers
 */
export const test = base.extend<{
  /**
   * Run axe accessibility scan on current page
   */
  makeAxeBuilder: () => AxeBuilder;
}>({
  makeAxeBuilder: async ({ page }, use) => {
    const makeAxeBuilder = () =>
      new AxeBuilder({ page })
        // Configure axe to match WCAG 2.1 Level AA
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        // Exclude third-party or known issues (if any)
        .exclude('#webpack-dev-server-client-overlay');

    await use(makeAxeBuilder);
  },
});

export { expect };

/**
 * Assert that accessibility scan has no violations
 */
export async function assertNoAccessibilityViolations(
  axeBuilder: AxeBuilder,
  options?: {
    /**
     * Maximum number of allowed violations (default: 0)
     */
    maxViolations?: number;
    /**
     * Specific rules to disable
     */
    disabledRules?: string[];
  }
) {
  const { maxViolations = 0, disabledRules = [] } = options || {};

  let builder = axeBuilder;

  // Disable specific rules if requested
  if (disabledRules.length > 0) {
    builder = builder.disableRules(disabledRules);
  }

  const results = await builder.analyze();

  // Format violation details for better error messages
  if (results.violations.length > maxViolations) {
    const violationDetails = results.violations
      .map((violation) => {
        const nodes = violation.nodes
          .map((node) => `  - ${node.html}\n    ${node.failureSummary}`)
          .join('\n');

        return `
${violation.id} (${violation.impact}): ${violation.description}
Help: ${violation.helpUrl}
Affected nodes (${violation.nodes.length}):
${nodes}
`;
      })
      .join('\n---\n');

    throw new Error(
      `Found ${results.violations.length} accessibility violations (max allowed: ${maxViolations}):\n${violationDetails}`
    );
  }

  return results;
}

/**
 * Common keyboard navigation patterns
 */
export const KeyboardPatterns = {
  /**
   * Test Tab navigation through interactive elements
   */
  async testTabNavigation(page: any, expectedStops: number) {
    let tabCount = 0;
    const maxTabs = expectedStops + 10; // Safety limit

    while (tabCount < maxTabs) {
      await page.keyboard.press('Tab');
      tabCount++;

      // Check if we've cycled back to the first element
      const firstElement = await page.locator(':focus').first();
      if (tabCount > expectedStops && firstElement) {
        break;
      }
    }

    expect(tabCount).toBeLessThanOrEqual(expectedStops + 5);
  },

  /**
   * Test Escape key closes modals/dropdowns
   */
  async testEscapeKey(page: any, trigger: string, container: string) {
    // Open the element
    await page.click(trigger);
    await expect(page.locator(container)).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');
    await expect(page.locator(container)).not.toBeVisible();
  },

  /**
   * Test Enter/Space activate buttons
   */
  async testButtonActivation(page: any, buttonSelector: string, expectedAction: () => Promise<void>) {
    // Focus the button
    await page.locator(buttonSelector).focus();

    // Test Enter key
    await page.keyboard.press('Enter');
    await expectedAction();

    // Reset state if needed
    await page.locator(buttonSelector).focus();

    // Test Space key
    await page.keyboard.press('Space');
    await expectedAction();
  },

  /**
   * Test arrow key navigation in lists/menus
   */
  async testArrowNavigation(
    page: any,
    containerSelector: string,
    itemSelector: string,
    expectedItems: number
  ) {
    const container = page.locator(containerSelector);
    await container.focus();

    // Navigate down
    for (let i = 0; i < expectedItems - 1; i++) {
      await page.keyboard.press('ArrowDown');
    }

    // Navigate back up
    for (let i = 0; i < expectedItems - 1; i++) {
      await page.keyboard.press('ArrowUp');
    }

    // Verify we're back at the start
    const firstItem = page.locator(itemSelector).first();
    await expect(firstItem).toBeFocused();
  },
};

/**
 * Focus management helpers
 */
export const FocusHelpers = {
  /**
   * Assert element is focused
   */
  async assertFocused(page: any, selector: string) {
    const focused = await page.evaluate((sel: string) => {
      const element = document.querySelector(sel);
      return document.activeElement === element;
    }, selector);

    expect(focused).toBe(true);
  },

  /**
   * Assert focus is visible (has focus ring/outline)
   */
  async assertFocusVisible(page: any, selector: string) {
    const element = page.locator(selector);
    await expect(element).toBeFocused();

    // Check for visible focus indicator
    const hasVisibleFocus = await element.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      const outline = styles.outline;
      const boxShadow = styles.boxShadow;

      // Should have either outline or box-shadow for focus
      return (
        (outline && outline !== 'none' && outline !== '0px') ||
        (boxShadow && boxShadow !== 'none')
      );
    });

    expect(hasVisibleFocus).toBe(true);
  },

  /**
   * Get tab order of all focusable elements
   */
  async getTabOrder(page: any): Promise<string[]> {
    return await page.evaluate(() => {
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ];

      const elements = document.querySelectorAll(focusableSelectors.join(','));

      return Array.from(elements).map((el) => {
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : '';
        const classes = el.className ? `.${el.className.split(' ').join('.')}` : '';
        return `${tag}${id}${classes}`;
      });
    });
  },
};

/**
 * Screen reader helpers (using ARIA attributes)
 */
export const ScreenReaderHelpers = {
  /**
   * Assert element has accessible name
   */
  async assertAccessibleName(page: any, selector: string, expectedName?: string) {
    const element = page.locator(selector);
    const accessibleName = await element.evaluate((el) => {
      // Use browser's accessibility API
      return (
        el.getAttribute('aria-label') ||
        el.getAttribute('aria-labelledby') ||
        (el as HTMLElement).innerText ||
        el.getAttribute('title') ||
        el.getAttribute('alt')
      );
    });

    expect(accessibleName).toBeTruthy();

    if (expectedName) {
      expect(accessibleName).toContain(expectedName);
    }
  },

  /**
   * Assert proper heading hierarchy
   */
  async assertHeadingHierarchy(page: any) {
    const headings = await page.evaluate(() => {
      const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(headingElements).map((h) => ({
        level: parseInt(h.tagName.substring(1)),
        text: h.textContent?.trim() || '',
      }));
    });

    // Should have exactly one h1
    const h1Count = headings.filter((h) => h.level === 1).length;
    expect(h1Count).toBe(1);

    // Check that heading levels don't skip (e.g., h1 -> h3 is invalid)
    for (let i = 1; i < headings.length; i++) {
      const current = headings[i].level;
      const previous = headings[i - 1].level;

      if (current > previous) {
        expect(current - previous).toBeLessThanOrEqual(1);
      }
    }
  },

  /**
   * Assert landmark regions are properly labeled
   */
  async assertLandmarksLabeled(page: any) {
    const unlabeledLandmarks = await page.evaluate(() => {
      const landmarks = document.querySelectorAll(
        'header, nav, main, aside, footer, [role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"]'
      );

      return Array.from(landmarks)
        .filter((landmark) => {
          const hasLabel =
            landmark.hasAttribute('aria-label') ||
            landmark.hasAttribute('aria-labelledby');
          const isUnique =
            document.querySelectorAll(landmark.tagName).length === 1;

          // Landmarks need labels if there are multiple of the same type
          return !hasLabel && !isUnique;
        })
        .map((el) => el.tagName);
    });

    expect(unlabeledLandmarks).toHaveLength(0);
  },
};
