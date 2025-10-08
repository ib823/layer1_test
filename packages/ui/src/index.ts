/**
 * @sap-framework/ui
 *
 * Ant Design wrapper components with design tokens for ABeam DataBridge.
 * All components enforce our design system through tokens.
 */

// Theme and Provider
export { TokenThemeProvider, withTokenTheme } from './withTokenTheme';
export type { TokenThemeProviderProps } from './withTokenTheme';
export { antdTheme, antdDarkTheme } from './antd-theme';

// Components
export { Button } from './components/Button';
export type { ButtonProps } from './components/Button';

export { Input, TextArea, Password, Search, Group as InputGroup } from './components/Input';
export type { InputProps, TextAreaProps, PasswordProps } from './components/Input';

export { Select, Option } from './components/Select';
export type { SelectProps } from './components/Select';

export { DatePicker, RangePicker } from './components/DatePicker';
export type { DatePickerProps } from './components/DatePicker';

export { Modal, confirm, info, success, warning, error } from './components/Modal';
export type { ModalProps } from './components/Modal';

export { Drawer } from './components/Drawer';
export type { DrawerProps } from './components/Drawer';

export { Tag, CheckableTag } from './components/Tag';
export type { TagProps } from './components/Tag';

export { Badge, Ribbon } from './components/Badge';
export type { BadgeProps } from './components/Badge';

export { Tabs, TabPane } from './components/Tabs';
export type { TabsProps } from './components/Tabs';

export { Tooltip } from './components/Tooltip';
export type { TooltipProps } from './components/Tooltip';

export { Form, FormItem, FormList, useForm, useWatch } from './components/Form';
export type { FormProps, FormItemProps, FormInstance } from './components/Form';

export { TableShell } from './components/TableShell';
export type { TableShellProps } from './components/TableShell';

// Re-export commonly used Ant Design components that don't need wrapping
export {
  Space,
  Divider,
  Card,
  Alert,
  Spin,
  Skeleton,
  Empty,
  Result,
  Breadcrumb,
  Menu,
  Dropdown,
  Popover,
  Popconfirm,
  message,
  notification,
  Progress,
  Steps,
  Upload,
  Avatar,
  List,
  Descriptions,
  Statistic,
  Tree,
  Timeline,
  Collapse,
  Carousel,
  Pagination,
  Checkbox,
  Radio,
  Switch,
  Slider,
  Rate,
  InputNumber,
  Cascader,
  TreeSelect,
  AutoComplete,
  TransferProps,
  BackTop,
  Affix,
  Anchor,
  FloatButton,
} from 'antd';

// Re-export types
export type {
  SpaceProps,
  DividerProps,
  CardProps,
  AlertProps,
  SpinProps,
  SkeletonProps,
  EmptyProps,
  ResultProps,
  BreadcrumbProps,
  MenuProps,
  DropdownProps,
  PopoverProps,
  PopconfirmProps,
  ProgressProps,
  StepsProps,
  UploadProps,
  AvatarProps,
  ListProps,
  DescriptionsProps,
  StatisticProps,
  TreeProps,
  TimelineProps,
  CollapseProps,
  CarouselProps,
  PaginationProps,
  CheckboxProps,
  RadioProps,
  SwitchProps,
  SiderProps,
  RateProps,
  InputNumberProps,
  CascaderProps,
  TreeSelectProps,
  AutoCompleteProps,
} from 'antd';
