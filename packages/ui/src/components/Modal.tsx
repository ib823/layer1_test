/**
 * Modal Component
 * Wrapper around Ant Design Modal with design tokens applied
 */

import React from 'react';
import { Modal as AntModal, type ModalProps as AntModalProps } from 'antd';
import clsx from 'clsx';

export interface ModalProps extends AntModalProps {
  /**
   * Modal size preset
   * @default 'medium'
   */
  modalSize?: 'small' | 'medium' | 'large' | 'full';
}

const sizeMap = {
  small: 480,
  medium: 640,
  large: 880,
  full: '90vw',
};

/**
 * Modal Component
 *
 * A modal dialog with consistent styling and behavior.
 *
 * @example
 * ```tsx
 * <Modal
 *   title="Confirm Action"
 *   open={isOpen}
 *   onOk={handleOk}
 *   onCancel={handleCancel}
 *   modalSize="medium"
 * >
 *   <p>Are you sure?</p>
 * </Modal>
 * ```
 */
export const Modal = React.forwardRef<any, ModalProps>(
  ({ modalSize = 'medium', width, className, ...props }, ref) => {
    return (
      <AntModal
        width={width || sizeMap[modalSize]}
        className={clsx('rounded-lg', className)}
        centered
        destroyOnClose
        {...props}
      />
    );
  }
);

Modal.displayName = 'Modal';

// Export static methods
export const { confirm, info, success, warning, error } = AntModal;
