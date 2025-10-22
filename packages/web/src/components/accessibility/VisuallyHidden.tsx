/**
 * Visually Hidden Component
 *
 * Hides content visually but keeps it accessible to screen readers.
 */

'use client';

export interface VisuallyHiddenProps {
  children: React.ReactNode;
  /** Whether to show on focus (for skip links, etc.) */
  showOnFocus?: boolean;
}

/**
 * Visually Hidden Component
 *
 * @example
 * ```tsx
 * <button>
 *   <TrashIcon />
 *   <VisuallyHidden>Delete item</VisuallyHidden>
 * </button>
 * ```
 */
export function VisuallyHidden({ children, showOnFocus = false }: VisuallyHiddenProps) {
  return (
    <span
      className={showOnFocus ? 'sr-only focus:not-sr-only' : 'sr-only'}
    >
      {children}
    </span>
  );
}
