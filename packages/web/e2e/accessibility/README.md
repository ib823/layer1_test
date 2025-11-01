# Accessibility Testing Suite

Comprehensive accessibility testing for WCAG 2.1 Level AA compliance using Playwright and axe-core.

## Overview

This test suite ensures that the application is accessible to all users, including those using assistive technologies like screen readers, keyboard-only navigation, and other accessibility tools.

## Test Coverage

### 1. **WCAG 2.1 AA Compliance** (`pages.a11y.spec.ts`)
- ✅ Automated axe-core scans on all major pages (23 pages)
- ✅ Document structure (headings, landmarks, semantic HTML)
- ✅ Color contrast compliance
- ✅ ARIA attributes validation
- ✅ Form accessibility (labels, required fields)
- ✅ Interactive elements (buttons, links)
- ✅ Image alt text
- ✅ Table structure and headers
- ✅ Dynamic content announcements

### 2. **Keyboard Navigation** (`keyboard-navigation.spec.ts`)
- ✅ Tab order and logical flow
- ✅ Escape key functionality (closing modals, dropdowns)
- ✅ Enter and Space key activation
- ✅ Focus trapping in modals
- ✅ Skip links implementation
- ✅ Focus visibility indicators
- ✅ Arrow key navigation (lists, menus)
- ✅ Custom component keyboard access

### 3. **Focus Management** (`focus-management.spec.ts`)
- ✅ Focus restoration after modal close
- ✅ Focus management on route changes
- ✅ Initial focus placement
- ✅ Form field focus and error handling
- ✅ Loading states and announcements
- ✅ Toast/notification announcements
- ✅ Tabs, accordions, and custom widgets

## Running the Tests

### Run All Accessibility Tests

```bash
pnpm test:e2e:a11y
```

### Run Specific Test Suites

```bash
# WCAG compliance tests only
pnpm test:e2e:a11y:wcag

# Keyboard navigation tests only
pnpm test:e2e:a11y:keyboard

# Focus management tests only
pnpm test:e2e:a11y:focus
```

### Run in UI Mode (Interactive)

```bash
pnpm test:e2e:a11y:ui
```

### Run in Headed Mode (See Browser)

```bash
pnpm test:e2e:a11y:headed
```

### Generate Report

```bash
pnpm test:e2e:a11y
pnpm test:e2e:report
```

## Test Results

### Accessibility Violations

When tests fail, axe-core provides detailed information:

```
Found 3 accessibility violations:

color-contrast (serious): Elements must have sufficient color contrast
Help: https://dequeuniversity.com/rules/axe/4.4/color-contrast
Affected nodes (3):
  - <button class="btn-secondary">Submit</button>
    Fix: Expected contrast ratio of at least 4.5:1 but found 3.2:1
```

### Fix Common Issues

#### 1. **Color Contrast**
- Text: 4.5:1 contrast ratio (AA)
- Large text (18pt+): 3:1 contrast ratio (AA)
- Use color contrast checker: https://webaim.org/resources/contrastchecker/

#### 2. **Missing Alt Text**
```html
<!-- Bad -->
<img src="logo.png">

<!-- Good -->
<img src="logo.png" alt="Company Logo">

<!-- Decorative images -->
<img src="decoration.png" alt="" role="presentation">
```

#### 3. **Form Labels**
```html
<!-- Bad -->
<input type="text" placeholder="Email">

<!-- Good -->
<label for="email">Email</label>
<input id="email" type="text" placeholder="email@example.com">

<!-- Or with aria-label -->
<input type="text" aria-label="Email address" placeholder="email@example.com">
```

#### 4. **Keyboard Focus**
```css
/* Bad - removes focus outline */
button:focus {
  outline: none;
}

/* Good - custom focus indicator */
button:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

/* Better - use :focus-visible for keyboard-only focus */
button:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}
```

#### 5. **Button Accessibility**
```html
<!-- Bad - div as button -->
<div onclick="handleClick()">Click me</div>

<!-- Good - semantic button -->
<button onclick="handleClick()">Click me</button>

<!-- Good - div with proper ARIA -->
<div role="button" tabindex="0" onclick="handleClick()" onkeydown="handleKeyDown(event)">
  Click me
</div>
```

#### 6. **Heading Hierarchy**
```html
<!-- Bad - skips levels -->
<h1>Page Title</h1>
<h3>Section</h3> <!-- Skip h2 -->

<!-- Good - proper hierarchy -->
<h1>Page Title</h1>
<h2>Main Section</h2>
<h3>Subsection</h3>
```

## Testing Checklist

### Before Committing
- [ ] Run full accessibility test suite
- [ ] Fix all axe-core violations
- [ ] Verify keyboard navigation works
- [ ] Test focus management in modals
- [ ] Check color contrast for new colors

### Manual Testing (Recommended)
- [ ] Test with actual screen reader (NVDA, JAWS, VoiceOver)
- [ ] Navigate entire page with keyboard only
- [ ] Test at 200% zoom
- [ ] Test with high contrast mode
- [ ] Test with Windows High Contrast theme

## Screen Reader Testing

While automated tests cover most issues, manual screen reader testing is recommended for:

1. **Complex interactions** - Multi-step workflows
2. **Dynamic content** - AJAX updates, notifications
3. **Custom widgets** - Accordions, tabs, carousels
4. **Form validation** - Error messaging
5. **Data tables** - Complex table structures

### Screen Readers to Test
- **Windows**: NVDA (free) or JAWS (commercial)
- **macOS**: VoiceOver (built-in)
- **Linux**: Orca (free)
- **Mobile**: TalkBack (Android), VoiceOver (iOS)

### Quick Screen Reader Commands

#### NVDA (Windows)
- Start/Stop: `Ctrl + Alt + N`
- Read next: `Down Arrow`
- Click: `Enter` or `Space`
- List headings: `NVDA + F7`

#### VoiceOver (macOS)
- Start/Stop: `Cmd + F5`
- Read next: `VO + Right Arrow` (VO = Ctrl + Option)
- Click: `VO + Space`
- Web rotor: `VO + U`

## CI/CD Integration

Add accessibility tests to your CI pipeline:

```yaml
# .github/workflows/e2e-accessibility.yml
name: Accessibility Tests

on: [pull_request]

jobs:
  a11y-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm test:e2e:a11y
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: accessibility-report
          path: packages/web/playwright-report/
```

## Resources

### Tools
- [axe DevTools Browser Extension](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [Lighthouse (Chrome DevTools)](https://developers.google.com/web/tools/lighthouse)
- [Color Contrast Analyzer](https://www.tpgi.com/color-contrast-checker/)

### Guidelines
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Articles](https://webaim.org/articles/)
- [Deque University](https://dequeuniversity.com/rules/axe/)

### Learning
- [Web Accessibility by Google (Free Course)](https://www.udacity.com/course/web-accessibility--ud891)
- [Microsoft Accessibility Fundamentals](https://docs.microsoft.com/en-us/learn/paths/accessibility-fundamentals/)
- [A11ycasts with Rob Dodson](https://www.youtube.com/playlist?list=PLNYkxOF6rcICWx0C9LVWWVqvHlYJyqw7g)

## Support

For questions or issues with accessibility tests:
1. Check the [axe-core rules documentation](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
2. Review the [WCAG 2.1 guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
3. Ask in the team's accessibility Slack channel

## Contributing

When adding new pages or components:
1. Add the page to `PAGES_TO_TEST` in `pages.a11y.spec.ts`
2. Write specific tests for custom interactions
3. Update this README with new test coverage
4. Run the full test suite before submitting PR

---

**Remember**: Automated testing catches ~30-50% of accessibility issues. Manual testing with real assistive technologies is essential for full accessibility coverage.
