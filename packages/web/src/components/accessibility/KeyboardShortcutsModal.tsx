/**
 * Keyboard Shortcuts Modal
 *
 * Displays available keyboard shortcuts in an accessible modal.
 * Triggered by Ctrl+/ or ? key.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';

export interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
  }>;
}

const DEFAULT_SHORTCUTS: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['Alt', 'D'], description: 'Go to Dashboard' },
      { keys: ['Alt', 'V'], description: 'Go to Violations' },
      { keys: ['Alt', 'R'], description: 'Go to Reports' },
      { keys: ['Alt', 'A'], description: 'Go to Analytics' },
      { keys: ['Alt', 'G'], description: 'Go to Glossary' },
    ],
  },
  {
    title: 'Search & Commands',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Open search' },
      { keys: ['Ctrl', '/'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close modal/dropdown' },
    ],
  },
  {
    title: 'Tables',
    shortcuts: [
      { keys: ['Ctrl', '→'], description: 'Next page' },
      { keys: ['Ctrl', '←'], description: 'Previous page' },
      { keys: ['Ctrl', 'Home'], description: 'First page' },
      { keys: ['Ctrl', 'End'], description: 'Last page' },
    ],
  },
  {
    title: 'Forms',
    shortcuts: [
      { keys: ['Ctrl', 'Enter'], description: 'Submit form' },
      { keys: ['Ctrl', 'Shift', 'R'], description: 'Reset form' },
      { keys: ['Esc'], description: 'Cancel' },
    ],
  },
  {
    title: 'Accessibility',
    shortcuts: [
      { keys: ['Tab'], description: 'Navigate forward' },
      { keys: ['Shift', 'Tab'], description: 'Navigate backward' },
      { keys: ['Enter'], description: 'Activate button/link' },
      { keys: ['Space'], description: 'Activate button/toggle' },
      { keys: ['↑', '↓'], description: 'Navigate lists/menus' },
    ],
  },
];

export const KeyboardShortcutsModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleShowShortcuts = () => setIsOpen(true);
    const handleCloseModal = () => setIsOpen(false);

    // Listen for custom event
    window.addEventListener('show-keyboard-shortcuts', handleShowShortcuts);

    // Listen for Ctrl+/ or ? to open modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === '/') || (e.shiftKey && e.key === '?')) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('show-keyboard-shortcuts', handleShowShortcuts);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Keyboard Shortcuts"
      size="lg"
      aria-describedby="shortcuts-description"
    >
      <div id="shortcuts-description" className="space-y-6">
        <p className="text-sm text-text-secondary">
          Use these keyboard shortcuts to navigate the application more efficiently. Most shortcuts
          work throughout the app.
        </p>

        {DEFAULT_SHORTCUTS.map((group) => (
          <div key={group.title} className="space-y-3">
            <h3 className="text-lg font-semibold text-text-primary">{group.title}</h3>
            <div className="space-y-2">
              {group.shortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-surface-secondary rounded-md"
                >
                  <span className="text-sm text-text-primary">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, keyIndex) => (
                      <React.Fragment key={keyIndex}>
                        <kbd className="px-2 py-1 text-xs font-semibold bg-white border border-border-default rounded shadow-sm">
                          {key}
                        </kbd>
                        {keyIndex < shortcut.keys.length - 1 && (
                          <span className="text-xs text-text-secondary mx-1">+</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-4 border-t border-border-default">
          <p className="text-xs text-text-secondary">
            <strong>Tip:</strong> Press <kbd className="px-1 py-0.5 text-xs bg-white border border-border-default rounded">Ctrl</kbd> +{' '}
            <kbd className="px-1 py-0.5 text-xs bg-white border border-border-default rounded">/</kbd> anytime to view
            this help.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default KeyboardShortcutsModal;
