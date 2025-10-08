# @sap-framework/ui

Enterprise UI component library for ABeam DataBridge GRC Platform.

## Overview

`@sap-framework/ui` is a design-token-enforced wrapper around Ant Design 5, providing a consistent, accessible, and themeable component library for the SAP MVP Framework. All components use design tokens from `@sap-framework/tokens` for unified styling.

## Installation

This is a workspace package and should be referenced via:

```json
{
  "dependencies": {
    "@sap-framework/ui": "workspace:*",
    "@sap-framework/tokens": "workspace:*"
  }
}
```

## Quick Start

### 1. Wrap your app with TokenThemeProvider

```tsx
// app/layout.tsx
import { TokenThemeProvider } from '@sap-framework/ui';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <TokenThemeProvider mode="light">
          {children}
        </TokenThemeProvider>
      </body>
    </html>
  );
}
```

### 2. Import components

```tsx
import { Button, Input, Select, Tag } from '@sap-framework/ui';

export function MyComponent() {
  return (
    <div>
      <Button variant="primary">Submit</Button>
      <Input placeholder="Enter text" />
      <Tag variant="critical">CRITICAL</Tag>
    </div>
  );
}
```

## Components

### Button

6 variants: `primary`, `default`, `dashed`, `text`, `link`, `danger`

```tsx
<Button variant="primary" onClick={handleClick}>
  Primary Action
</Button>

<Button variant="danger" icon={<DeleteOutlined />}>
  Delete
</Button>
```

**Props**: Extends Ant Design ButtonProps (except `type` which is replaced by `variant`)

### Input

Variants: `Input`, `Input.TextArea`, `Input.Password`, `Input.Search`

```tsx
<Input placeholder="Username" />
<Input.TextArea rows={4} placeholder="Description" />
<Input.Password placeholder="Password" />
<Input.Search placeholder="Search..." onSearch={handleSearch} />
```

### Select

Single and multi-select with token styling

```tsx
<Select
  placeholder="Choose option"
  options={[
    { label: 'Option 1', value: '1' },
    { label: 'Option 2', value: '2' },
  ]}
/>

<Select mode="multiple" placeholder="Select multiple" options={options} />
```

### Tag

8 variants including GRC risk levels

```tsx
<Tag variant="critical">CRITICAL</Tag>
<Tag variant="high">HIGH</Tag>
<Tag variant="medium">MEDIUM</Tag>
<Tag variant="low">LOW</Tag>
<Tag variant="success">SUCCESS</Tag>
<Tag variant="warning">WARNING</Tag>
<Tag variant="danger">DANGER</Tag>
<Tag variant="default">DEFAULT</Tag>
```

### DatePicker

Date and range pickers

```tsx
<DatePicker />
<DatePicker.RangePicker />
```

### Modal

Dialogs with token-based styling

```tsx
<Modal
  open={isOpen}
  onCancel={handleClose}
  title="Confirmation"
  footer={[
    <Button key="cancel" onClick={handleClose}>Cancel</Button>,
    <Button key="submit" variant="primary" onClick={handleSubmit}>
      Confirm
    </Button>,
  ]}
>
  <p>Are you sure?</p>
</Modal>
```

### Drawer

Side panels with 3 sizes: `small`, `default`, `large`

```tsx
<Drawer
  open={isOpen}
  onClose={handleClose}
  title="Details"
  drawerSize="large"
>
  <p>Content here</p>
</Drawer>
```

### Badge

Status indicators

```tsx
<Badge status="success" text="Active" />
<Badge status="error" text="Failed" />
<Badge count={5}>
  <Button icon={<BellOutlined />} />
</Badge>
```

### Tabs

Tab navigation

```tsx
<Tabs
  items={[
    { key: '1', label: 'Tab 1', children: <div>Content 1</div> },
    { key: '2', label: 'Tab 2', children: <div>Content 2</div> },
  ]}
/>
```

### Tooltip

Contextual help

```tsx
<Tooltip title="Helpful text">
  <Button icon={<QuestionCircleOutlined />} />
</Tooltip>
```

### Form

Form layout with validation

```tsx
import { Form, Input, Button } from '@sap-framework/ui';

const [form] = Form.useForm();

<Form form={form} layout="vertical" onFinish={handleSubmit}>
  <Form.Item
    label="Username"
    name="username"
    rules={[{ required: true, message: 'Required' }]}
  >
    <Input />
  </Form.Item>
  <Form.Item>
    <Button variant="primary" htmlType="submit">Submit</Button>
  </Form.Item>
</Form>
```

### TableShell

Data tables with built-in loading states

```tsx
<TableShell
  columns={columns}
  dataSource={data}
  loading={isLoading}
  rowKey="id"
  pagination={{
    showSizeChanger: true,
    showTotal: (total) => `Total ${total} items`,
  }}
/>
```

### Other Components

All other Ant Design components are re-exported for convenience:
- **Card** - Content container
- **Space** - Spacing between elements
- **Descriptions** - Key-value pairs display
- **Statistic** - Numeric display with formatting
- **Alert**, **Spin**, **Progress**, etc.

## Component Principles

### 1. Design Token Enforcement
All components use CSS variables from `@sap-framework/tokens`:

```tsx
// ✅ Good - Uses token
<div className="bg-surface-secondary" />

// ❌ Bad - Hardcoded color
<div style={{ background: '#F8FAFC' }} />
```

### 2. Sensible Defaults
Components come with defaults aligned to our design system:

```tsx
// Button defaults to size="middle" with transition
<Button>Click</Button>

// Modal defaults to centered, destroyOnClose
<Modal title="Title">Content</Modal>
```

### 3. Extended Props
Wrapper components add convenience props:

```tsx
// Input with label, error, helper text
<Input
  label="Email"
  error="Invalid email"
  helperText="We'll never share your email"
/>
```

### 4. Risk Level Variants
For GRC-specific components, risk variants are supported:

```tsx
<Tag variant="critical">Critical Risk</Tag>
<Tag variant="high">High Risk</Tag>
<Tag variant="medium">Medium Risk</Tag>
<Tag variant="low">Low Risk</Tag>
```

## Customization

### Override Theme
Pass `themeOverride` to customize theme:

```tsx
<TokenThemeProvider
  mode="light"
  themeOverride={{
    token: {
      colorPrimary: '#1890ff', // Override brand color
    },
  }}
>
  <App />
</TokenThemeProvider>
```

### Dark Mode
Set `mode="dark"` for dark theme:

```tsx
<TokenThemeProvider mode="dark">
  <App />
</TokenThemeProvider>
```

### Internationalization
Pass locale for i18n:

```tsx
import enUS from 'antd/locale/en_US';
import jaJP from 'antd/locale/ja_JP';

<TokenThemeProvider locale={jaJP}>
  <App />
</TokenThemeProvider>
```

## Design System Rules

### DO ✅

- Import from `@sap-framework/ui`
- Use `variant` prop on Button/Tag
- Use design tokens via Tailwind classes (`bg-brand-primary`)
- Use CSS custom properties (`var(--brand-primary)`)

### DON'T ❌

- Import directly from `antd`
- Use hardcoded colors (`#DC2626`)
- Use inline styles (`style={{ color: 'red' }}`)
- Use arbitrary values without tokens (`bg-[#123456]`)

## Best Practices

### 1. Always Use Wrappers
Import from `@sap-framework/ui`, not directly from `antd`:

```tsx
// ✅ Good
import { Button } from '@sap-framework/ui';

// ❌ Bad
import { Button } from 'antd';
```

### 2. Leverage Semantic Variants
Use semantic variants instead of raw colors:

```tsx
// ✅ Good
<Tag variant="danger">Error</Tag>

// ❌ Bad
<Tag color="red">Error</Tag>
```

### 3. Use Token Classes
Prefer token-based Tailwind classes:

```tsx
// ✅ Good
<div className="bg-brand-primary text-white p-4">

// ❌ Bad
<div className="bg-[#2563EB] text-white p-4">
```

### 4. Accessibility
All components meet WCAG 2.1 AA standards:
- ✅ 44px minimum touch targets
- ✅ ARIA labels and roles
- ✅ Keyboard navigation
- ✅ Color contrast ratios
- ✅ Screen reader support

## Practical Examples

### Form with Validation

```tsx
const [form] = Form.useForm();

const handleSubmit = (values: any) => {
  console.log('Form values:', values);
};

<Form form={form} layout="vertical" onFinish={handleSubmit}>
  <Form.Item
    label="Email"
    name="email"
    rules={[
      { required: true, message: 'Please enter email' },
      { type: 'email', message: 'Invalid email' },
    ]}
  >
    <Input placeholder="user@example.com" />
  </Form.Item>

  <Form.Item
    label="Password"
    name="password"
    rules={[{ required: true, min: 8 }]}
  >
    <Input.Password />
  </Form.Item>

  <Form.Item>
    <Button variant="primary" htmlType="submit">
      Sign In
    </Button>
  </Form.Item>
</Form>
```

### Data Table with Actions

```tsx
const columns: ColumnsType<User> = [
  {
    title: 'Name',
    dataIndex: 'name',
    sorter: true,
  },
  {
    title: 'Status',
    dataIndex: 'status',
    render: (status) => <Tag variant={status}>{status}</Tag>,
  },
  {
    title: 'Actions',
    render: (_, record) => (
      <Space>
        <Button variant="link" onClick={() => handleEdit(record)}>
          Edit
        </Button>
        <Button variant="link" danger onClick={() => handleDelete(record)}>
          Delete
        </Button>
      </Space>
    ),
  },
];

<TableShell
  columns={columns}
  dataSource={users}
  rowKey="id"
  onRow={(record) => ({
    onClick: () => handleRowClick(record),
  })}
/>
```

### Modal Confirmation

```tsx
const [isOpen, setIsOpen] = useState(false);

const handleConfirm = () => {
  // Perform action
  setIsOpen(false);
};

<Modal
  open={isOpen}
  onCancel={() => setIsOpen(false)}
  title="Confirm Action"
  footer={[
    <Button key="cancel" onClick={() => setIsOpen(false)}>
      Cancel
    </Button>,
    <Button key="confirm" variant="danger" onClick={handleConfirm}>
      Confirm Delete
    </Button>,
  ]}
>
  <p>Are you sure you want to delete this item?</p>
  <p className="text-secondary">This action cannot be undone.</p>
</Modal>
```

## TypeScript

All components are fully typed:

```tsx
import type { ButtonProps, SelectProps } from '@sap-framework/ui';

const MyButton: React.FC<ButtonProps> = (props) => {
  return <Button {...props} />;
};
```

## Linting

ESLint rules enforce design system usage:

```bash
# Run linting
pnpm lint

# Auto-fix violations
pnpm lint:fix
```

**Custom Rules**:
- `no-hardcoded-colors` - Prevents hex/rgb colors
- `no-inline-styles` - Prevents inline style attributes
- `require-token-classes` - Enforces token-based classes

## Development

```bash
# Build the package
pnpm build

# Watch mode
pnpm dev

# Clean build
pnpm clean
```

## Dependencies

- `antd` ^5.27.0
- `@sap-framework/tokens` (workspace)
- `react` ^19.0.0
- `clsx` for className utilities

## Contributing

1. Create new components in `src/components/`
2. Export from `src/index.ts`
3. Follow existing component patterns
4. Use design tokens for all styling
5. Add TypeScript types
6. Update this README

## License

Proprietary - ABeam Consulting © 2025
