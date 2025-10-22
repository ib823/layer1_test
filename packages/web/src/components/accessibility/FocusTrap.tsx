/**
 * Focus Trap Component
 *
 * Traps keyboard focus within a container (for modals, dialogs, etc.)
 */

'use client';

import { useEffect, useRef } from 'react';

export interface FocusTrapProps {
  children: React.ReactNode;
  /** Whether the trap is active */
  active?: boolean;
  /** Element to focus when trap activates */
  initialFocus?: HTMLElement | null;
  /** Callback when user tries to escape (Escape key) */
  onEscape?: () => void;
}

/**
 * Focus Trap Component
 *
 * @example
 * ```tsx
 * <FocusTrap active={isOpen} onEscape={() => setIsOpen(false)}>
 *   <Modal>
 *     <input />
 *     <button>Submit</button>
 *   </Modal>
 * </FocusTrap>
 * ```
 */
export function FocusTrap({
  children,
  active = true,
  initialFocus,
  onEscape,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    // Store currently focused element
    previouslyFocusedElement.current = document.activeElement as HTMLElement;

    // Focus initial element or first focusable element
    const focusableElements = getFocusableElements();
    const elementToFocus = initialFocus || focusableElements[0];
    elementToFocus?.focus();

    // Handle Tab and Shift+Tab
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus to previously focused element
      previouslyFocusedElement.current?.focus();
    };
  }, [active, initialFocus, onEscape]);

  const getFocusableElements = (): HTMLElement[] => {
    if (!containerRef.current) return [];

    const selector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    return Array.from(containerRef.current.querySelectorAll(selector));
  };

  return (
    <div ref={containerRef} role="presentation">
      {children}
    </div>
  );
}

/**
 * Hook for managing focus
 */
export function useFocusManagement() {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const saveFocus = () => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  };

  const restoreFocus = () => {
    previousFocusRef.current?.focus();
  };

  const focusElement = (element: HTMLElement | null) => {
    element?.focus();
  };

  return {
    saveFocus,
    restoreFocus,
    focusElement,
  };
}
