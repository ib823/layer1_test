/**
 * Form Component
 * Wrapper around Ant Design Form with design tokens applied
 */

import React from 'react';
import {
  Form as AntForm,
  type FormProps as AntFormProps,
  type FormItemProps as AntFormItemProps,
  type FormInstance,
} from 'antd';
import clsx from 'clsx';

export interface FormProps extends AntFormProps {}
export interface FormItemProps extends AntFormItemProps {}

/**
 * Form Component
 *
 * A form with consistent layout and validation.
 *
 * @example
 * ```tsx
 * <Form
 *   layout="vertical"
 *   onFinish={handleSubmit}
 * >
 *   <Form.Item label="Name" name="name" rules={[{ required: true }]}>
 *     <Input />
 *   </Form.Item>
 *   <Button type="primary" htmlType="submit">
 *     Submit
 *   </Button>
 * </Form>
 * ```
 */
export const Form = React.forwardRef<FormInstance, FormProps>(
  ({ className, layout = 'vertical', requiredMark = true, ...props }, ref) => {
    return (
      <AntForm
        ref={ref}
        layout={layout}
        requiredMark={requiredMark}
        className={clsx(className)}
        scrollToFirstError
        {...(props as any)}
      />
    );
  }
);

Form.displayName = 'Form';

// Export form utilities
export const FormItem = AntForm.Item;
export const FormList = AntForm.List;
export const useForm = AntForm.useForm;
export const useWatch: typeof AntForm.useWatch = AntForm.useWatch;

export type { FormInstance };
