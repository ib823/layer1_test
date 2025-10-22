/**
 * Accessibility Components
 *
 * WCAG 2.1 Level AA compliant components and utilities.
 */

export { SkipLink } from './SkipLink';
export type { SkipLinkProps } from './SkipLink';

export { VisuallyHidden } from './VisuallyHidden';
export type { VisuallyHiddenProps } from './VisuallyHidden';

export { LiveRegion, useLiveRegion } from './LiveRegion';
export type { LiveRegionProps } from './LiveRegion';

export { FocusTrap, useFocusManagement } from './FocusTrap';
export type { FocusTrapProps } from './FocusTrap';

export {
  useKeyboardShortcuts,
  KeyboardShortcutsHelp,
  commonDataTableShortcuts,
} from './KeyboardShortcuts';
export type { KeyboardShortcut, KeyboardShortcutsProps } from './KeyboardShortcuts';
