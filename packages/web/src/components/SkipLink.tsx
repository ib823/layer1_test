'use client';

/**
 * Skip Link Component for Keyboard Accessibility
 * Allows keyboard users to skip navigation and go directly to main content
 *
 * Usage: Add to root layout before all other content
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      tabIndex={0}
    >
      Skip to main content
    </a>
  );
}

/**
 * Screen Reader Only utility class
 * Add this to your globals.css if not already present:
 *
 * .sr-only {
 *   position: absolute;
 *   width: 1px;
 *   height: 1px;
 *   padding: 0;
 *   margin: -1px;
 *   overflow: hidden;
 *   clip: rect(0, 0, 0, 0);
 *   white-space: nowrap;
 *   border-width: 0;
 * }
 *
 * .focus\\:not-sr-only:focus {
 *   position: static;
 *   width: auto;
 *   height: auto;
 *   padding: revert;
 *   margin: revert;
 *   overflow: visible;
 *   clip: auto;
 *   white-space: normal;
 * }
 */
