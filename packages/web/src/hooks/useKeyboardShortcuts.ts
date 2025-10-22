/**
 * Keyboard Shortcuts Hook
 *
 * Provides global keyboard shortcuts for improved accessibility and power user workflows.
 * Follows accessibility best practices for keyboard navigation.
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

export interface KeyboardShortcut {
  /** Keyboard combination (e.g., 'ctrl+k', 'alt+s') */
  key: string;
  /** Description for help menu */
  description: string;
  /** Handler function */
  handler: () => void;
  /** Whether shortcut should work in input fields */
  allowInInput?: boolean;
}

export interface UseKeyboardShortcutsOptions {
  /** List of shortcuts to register */
  shortcuts: KeyboardShortcut[];
  /** Whether shortcuts are enabled */
  enabled?: boolean;
}

/**
 * Parse keyboard shortcut string into parts
 */
function parseShortcut(shortcut: string): {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  key: string;
} {
  const parts = shortcut.toLowerCase().split('+');
  const modifiers = {
    ctrl: parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    meta: parts.includes('meta') || parts.includes('cmd'),
    key: parts[parts.length - 1],
  };
  return modifiers;
}

/**
 * Check if event matches shortcut definition
 */
function matchesShortcut(
  event: KeyboardEvent,
  shortcut: ReturnType<typeof parseShortcut>
): boolean {
  return (
    event.key.toLowerCase() === shortcut.key &&
    event.ctrlKey === shortcut.ctrl &&
    event.shiftKey === shortcut.shift &&
    event.altKey === shortcut.alt &&
    event.metaKey === shortcut.meta
  );
}

/**
 * Check if element is an input field
 */
function isInputElement(element: Element | null): boolean {
  if (!element) return false;

  const tagName = element.tagName.toLowerCase();
  const isEditable =
    element.getAttribute('contenteditable') === 'true' ||
    element.getAttribute('role') === 'textbox';

  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    isEditable
  );
}

/**
 * Global keyboard shortcuts hook
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions) {
  const { shortcuts, enabled = true } = options;
  const shortcutsRef = useRef(shortcuts);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Check if we're in an input field
      const inInput = isInputElement(event.target as Element);

      // Find matching shortcut
      for (const shortcut of shortcutsRef.current) {
        // Skip if in input and shortcut doesn't allow it
        if (inInput && !shortcut.allowInInput) continue;

        const parsed = parseShortcut(shortcut.key);

        if (matchesShortcut(event, parsed)) {
          event.preventDefault();
          shortcut.handler();
          return;
        }
      }
    },
    [enabled]
  );

  // Register event listener
  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

/**
 * Global navigation shortcuts
 */
export function useGlobalShortcuts() {
  const router = useRouter();

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'alt+d',
      description: 'Go to Dashboard',
      handler: () => router.push('/dashboard'),
    },
    {
      key: 'alt+v',
      description: 'Go to Violations',
      handler: () => router.push('/violations'),
    },
    {
      key: 'alt+r',
      description: 'Go to Reports',
      handler: () => router.push('/reports'),
    },
    {
      key: 'alt+a',
      description: 'Go to Analytics',
      handler: () => router.push('/analytics'),
    },
    {
      key: 'alt+g',
      description: 'Go to Glossary',
      handler: () => router.push('/glossary'),
    },
    {
      key: 'ctrl+/',
      description: 'Show keyboard shortcuts',
      handler: () => {
        // Dispatch custom event to show shortcuts modal
        window.dispatchEvent(new CustomEvent('show-keyboard-shortcuts'));
      },
      allowInInput: true,
    },
    {
      key: 'escape',
      description: 'Close modal/dropdown',
      handler: () => {
        // Dispatch custom event to close modals
        window.dispatchEvent(new CustomEvent('close-modal'));
      },
      allowInInput: true,
    },
  ];

  useKeyboardShortcuts({ shortcuts });

  return shortcuts;
}

/**
 * Search shortcut
 */
export function useSearchShortcut(onOpen: () => void) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'ctrl+k',
      description: 'Open search',
      handler: onOpen,
      allowInInput: false,
    },
    {
      key: 'meta+k',
      description: 'Open search (Mac)',
      handler: onOpen,
      allowInInput: false,
    },
  ];

  useKeyboardShortcuts({ shortcuts });
}

/**
 * Table navigation shortcuts
 */
export function useTableShortcuts(options: {
  onNext?: () => void;
  onPrevious?: () => void;
  onFirst?: () => void;
  onLast?: () => void;
  onRefresh?: () => void;
}) {
  const { onNext, onPrevious, onFirst, onLast, onRefresh } = options;

  const shortcuts: KeyboardShortcut[] = [];

  if (onNext) {
    shortcuts.push({
      key: 'ctrl+arrowright',
      description: 'Next page',
      handler: onNext,
    });
  }

  if (onPrevious) {
    shortcuts.push({
      key: 'ctrl+arrowleft',
      description: 'Previous page',
      handler: onPrevious,
    });
  }

  if (onFirst) {
    shortcuts.push({
      key: 'ctrl+home',
      description: 'First page',
      handler: onFirst,
    });
  }

  if (onLast) {
    shortcuts.push({
      key: 'ctrl+end',
      description: 'Last page',
      handler: onLast,
    });
  }

  if (onRefresh) {
    shortcuts.push({
      key: 'ctrl+r',
      description: 'Refresh table',
      handler: (e) => {
        onRefresh();
      },
    });
  }

  useKeyboardShortcuts({ shortcuts });
}

/**
 * Form shortcuts
 */
export function useFormShortcuts(options: {
  onSubmit?: () => void;
  onReset?: () => void;
  onCancel?: () => void;
}) {
  const { onSubmit, onReset, onCancel } = options;

  const shortcuts: KeyboardShortcut[] = [];

  if (onSubmit) {
    shortcuts.push({
      key: 'ctrl+enter',
      description: 'Submit form',
      handler: onSubmit,
      allowInInput: true,
    });
  }

  if (onReset) {
    shortcuts.push({
      key: 'ctrl+shift+r',
      description: 'Reset form',
      handler: onReset,
      allowInInput: true,
    });
  }

  if (onCancel) {
    shortcuts.push({
      key: 'escape',
      description: 'Cancel',
      handler: onCancel,
      allowInInput: true,
    });
  }

  useKeyboardShortcuts({ shortcuts });
}
