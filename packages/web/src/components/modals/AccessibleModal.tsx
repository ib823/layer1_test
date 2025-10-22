/**
 * Accessible Modal Component
 *
 * WCAG 2.1 AA compliant modal dialog that provides:
 * - Dialog role and aria-modal (4.1.2)
 * - Focus trapping (2.4.3)
 * - Escape key handling (2.1.1)
 * - Proper labeling with aria-labelledby and aria-describedby (4.1.2)
 * - Focus management (returns focus on close)
 *
 * @example
 * ```tsx
 * <AccessibleModal
 *   modalTitle="Remediate Violation"
 *   modalDescription="Complete this form to specify the remediation action"
 *   open={isOpen}
 *   onCancel={() => setIsOpen(false)}
 *   onOk={handleSubmit}
 * >
 *   <Form>...</Form>
 * </AccessibleModal>
 * ```
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { Modal } from 'antd';
import type { ModalProps } from 'antd';
import { FocusTrap } from '@/components/accessibility/FocusTrap';

interface AccessibleModalProps extends Omit<ModalProps, 'modalRender'> {
  /** Title for screen readers (can be different from visible title) */
  modalTitle: string;
  /** Description for screen readers */
  modalDescription: string;
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal is closed */
  onCancel?: (e: React.MouseEvent<HTMLElement>) => void;
  /** Children to render inside modal */
  children: React.ReactNode;
}

export const AccessibleModal: React.FC<AccessibleModalProps> = ({
  modalTitle,
  modalDescription,
  children,
  open,
  onCancel,
  ...props
}) => {
  // Generate unique IDs for this modal instance
  const titleId = useRef(`modal-title-${Math.random().toString(36).substr(2, 9)}`);
  const descId = useRef(`modal-desc-${Math.random().toString(36).substr(2, 9)}`);

  // Store the previously focused element
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      // Save the currently focused element when modal opens
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
    } else {
      // Restore focus when modal closes
      if (previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus();
      }
    }
  }, [open]);

  const handleCancel = (e: React.MouseEvent<HTMLElement>) => {
    if (onCancel) {
      onCancel(e);
    }
  };

  return (
    <FocusTrap active={open} onEscape={() => handleCancel({} as React.MouseEvent<HTMLElement>)}>
      <Modal
        {...props}
        open={open}
        onCancel={handleCancel}
        modalRender={(modal) => (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId.current}
            aria-describedby={descId.current}
          >
            {/* Hidden title for screen readers */}
            <h2 id={titleId.current} className="sr-only">
              {modalTitle}
            </h2>
            {/* Hidden description for screen readers */}
            <p id={descId.current} className="sr-only">
              {modalDescription}
            </p>
            {modal}
          </div>
        )}
      >
        {children}
      </Modal>
    </FocusTrap>
  );
};

export default AccessibleModal;
