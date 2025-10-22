/**
 * AccessibleFormField Tests
 *
 * Tests WCAG 2.1 AA compliance for form field component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Form } from 'antd';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AccessibleFormField } from '../AccessibleFormField';

expect.extend(toHaveNoViolations);

// Wrapper component to provide Form context
const FormWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [form] = Form.useForm();
  return (
    <Form form={form} layout="vertical">
      {children}
    </Form>
  );
};

describe('AccessibleFormField', () => {
  describe('WCAG 2.1 AA Compliance', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <FormWrapper>
          <AccessibleFormField
            name="email"
            label="Email Address"
            required
            helpText="Enter your email address"
          >
            <input type="email" />
          </AccessibleFormField>
        </FormWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper aria-label on input field', () => {
      render(
        <FormWrapper>
          <AccessibleFormField
            name="email"
            label="Email Address"
            required
          >
            <input type="email" data-testid="email-input" />
          </AccessibleFormField>
        </FormWrapper>
      );

      const input = screen.getByTestId('email-input');
      expect(input).toHaveAttribute('aria-label', 'Email Address');
    });

    it('should associate help text with aria-describedby', () => {
      render(
        <FormWrapper>
          <AccessibleFormField
            name="email"
            label="Email Address"
            helpText="Enter your email address"
          >
            <input type="email" data-testid="email-input" />
          </AccessibleFormField>
        </FormWrapper>
      );

      const input = screen.getByTestId('email-input');
      const describedBy = input.getAttribute('aria-describedby');

      expect(describedBy).toBeTruthy();
      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    });

    it('should mark required fields with aria-required', () => {
      render(
        <FormWrapper>
          <AccessibleFormField
            name="email"
            label="Email Address"
            required
          >
            <input type="email" data-testid="email-input" />
          </AccessibleFormField>
        </FormWrapper>
      );

      const input = screen.getByTestId('email-input');
      expect(input).toHaveAttribute('aria-required', 'true');
    });

    it('should mark fields with errors as aria-invalid', () => {
      render(
        <FormWrapper>
          <AccessibleFormField
            name="email"
            label="Email Address"
            errorMessage="Invalid email address"
          >
            <input type="email" data-testid="email-input" />
          </AccessibleFormField>
        </FormWrapper>
      );

      const input = screen.getByTestId('email-input');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should display error messages with role="alert"', () => {
      render(
        <FormWrapper>
          <AccessibleFormField
            name="email"
            label="Email Address"
            errorMessage="Invalid email address"
          >
            <input type="email" />
          </AccessibleFormField>
        </FormWrapper>
      );

      const errorElement = screen.getByRole('alert');
      expect(errorElement).toHaveTextContent('Invalid email address');
      expect(errorElement).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have unique field ID', () => {
      const { rerender } = render(
        <FormWrapper>
          <AccessibleFormField
            name="email"
            label="Email Address"
          >
            <input type="email" data-testid="email-input" />
          </AccessibleFormField>
        </FormWrapper>
      );

      const firstId = screen.getByTestId('email-input').getAttribute('id');

      rerender(
        <FormWrapper>
          <AccessibleFormField
            name="password"
            label="Password"
          >
            <input type="password" data-testid="password-input" />
          </AccessibleFormField>
        </FormWrapper>
      );

      const secondId = screen.getByTestId('password-input').getAttribute('id');
      expect(firstId).not.toBe(secondId);
    });
  });

  describe('WCAG Criteria Coverage', () => {
    it('should satisfy 3.3.2 Labels or Instructions (Level A)', () => {
      render(
        <FormWrapper>
          <AccessibleFormField
            name="email"
            label="Email Address"
            helpText="We'll never share your email"
          >
            <input type="email" />
          </AccessibleFormField>
        </FormWrapper>
      );

      // Label present
      expect(screen.getByText('Email Address')).toBeInTheDocument();
      // Instructions present
      expect(screen.getByText("We'll never share your email")).toBeInTheDocument();
    });

    it('should satisfy 3.3.1 Error Identification (Level A)', () => {
      render(
        <FormWrapper>
          <AccessibleFormField
            name="email"
            label="Email Address"
            errorMessage="Invalid email format"
          >
            <input type="email" />
          </AccessibleFormField>
        </FormWrapper>
      );

      // Error identified in text
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      // Error programmatically identified
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('should satisfy 4.1.3 Status Messages (Level AA)', () => {
      render(
        <FormWrapper>
          <AccessibleFormField
            name="email"
            label="Email Address"
            errorMessage="Invalid email"
          >
            <input type="email" />
          </AccessibleFormField>
        </FormWrapper>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
      expect(alert).toHaveAttribute('aria-atomic', 'true');
    });
  });

  describe('Integration with Ant Design', () => {
    it('should work with Ant Design Input component', () => {
      const { Input } = require('antd');

      render(
        <FormWrapper>
          <AccessibleFormField
            name="username"
            label="Username"
          >
            <Input data-testid="username-input" />
          </AccessibleFormField>
        </FormWrapper>
      );

      expect(screen.getByTestId('username-input')).toBeInTheDocument();
    });

    it('should work with Ant Design TextArea component', () => {
      const { Input } = require('antd');

      render(
        <FormWrapper>
          <AccessibleFormField
            name="comments"
            label="Comments"
          >
            <Input.TextArea data-testid="comments-input" />
          </AccessibleFormField>
        </FormWrapper>
      );

      expect(screen.getByTestId('comments-input')).toBeInTheDocument();
    });

    it('should work with Ant Design Select component', () => {
      const { Select } = require('antd');

      render(
        <FormWrapper>
          <AccessibleFormField
            name="role"
            label="Role"
          >
            <Select data-testid="role-select">
              <Select.Option value="admin">Admin</Select.Option>
              <Select.Option value="user">User</Select.Option>
            </Select>
          </AccessibleFormField>
        </FormWrapper>
      );

      // Select component should be rendered
      const selectElement = screen.getByTestId('role-select');
      expect(selectElement).toBeInTheDocument();
    });
  });
});
