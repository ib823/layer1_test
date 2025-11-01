/**
 * Skip to Main Content Link
 *
 * Allows keyboard users to skip navigation and go directly to main content.
 * Required for WCAG 2.1 Level AA compliance.
 */

'use client';

export interface SkipLinkProps {
  /** Target element ID to skip to */
  targetId?: string;
  /** Custom label */
  label?: string;
  /** Custom className */
  className?: string;
}

/**
 * Skip Link Component
 *
 * Invisible until focused, appears at top of page when user presses Tab.
 *
 * @example
 * ```tsx
 * // In layout
 * <SkipLink targetId="main-content" />
 *
 * // In page
 * <main id="main-content">...</main>
 * ```
 */
export function SkipLink({
  targetId = 'main-content',
  label = 'Skip to main content',
  className = '',
}: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={`
        sr-only focus:not-sr-only
        focus:absolute focus:top-4 focus:left-4 focus:z-50
        focus:px-4 focus:py-2
        focus:bg-blue-600 focus:text-white
        focus:rounded-md focus:shadow-lg
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        font-medium
        ${className}
      `}
    >
      {label}
    </a>
  );
}
