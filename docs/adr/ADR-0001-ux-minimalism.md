# ADR-0001: UX Minimalism and Progressive Disclosure

**Status:** Accepted
**Date:** 2025-10-07
**Deciders:** @ib823

## Context

Enterprise GRC applications often suffer from information overload. Users are presented with dozens of metrics, buttons, and options simultaneously on a single screen, leading to:

1. **Decision Paralysis**: Too many choices make it unclear what action to take
2. **Cognitive Overload**: Users spend mental energy parsing the interface rather than solving problems
3. **Longer Onboarding**: New users struggle to understand the "happy path"
4. **Lower Engagement**: Cluttered UIs feel overwhelming and discouraging

Competing products (SAP GRC Access Control, Oracle GRC, Workday Compliance) exhibit these problems. We have an opportunity to differentiate through **radical simplicity**.

### Design Philosophies Considered

1. **Feature-Rich Dashboard** (traditional enterprise approach)
   - Show all capabilities upfront
   - Users can access everything from one screen
   - Pros: Power users can work quickly
   - Cons: New users overwhelmed, high cognitive load

2. **Progressive Disclosure** (Steve Jobs minimalism)
   - Each screen has ONE primary action
   - Advanced features accessible but not prominent
   - Pros: Clear path for all users, low cognitive load
   - Cons: May require more clicks for power users

3. **Hybrid Approach** (role-based UIs)
   - Show different interfaces for different user roles
   - Pros: Tailored experiences
   - Cons: Complex to maintain, roles may overlap

## Decision

We adopt **Progressive Disclosure** as our core UX principle, inspired by Apple's design philosophy:

### Core Principles

1. **Single Focal Point**: Every screen has ONE primary action. Secondary actions are visually subordinate.
2. **Informational Clarity**: Status indicators must answer two questions:
   - "What does this mean?"
   - "What should I do?"
3. **Meaningful Actions Only**: No decorative elements or features that don't serve user goals.
4. **Accessible by Default**: WCAG 2.1 AA minimum (keyboard nav, screen reader support, contrast).
5. **Motion with Purpose**: Animations only for feedback or guiding attention.

### Alternatives Considered

1. **Feature-Rich Dashboard (Rejected)**
   - Would mimic existing solutions (no competitive advantage)
   - High maintenance cost (every new feature competes for dashboard space)
   - Accessibility challenges (too many interactive elements)

2. **Progressive Disclosure (Chosen)**
   - Differentiates us from competitors
   - Faster time-to-value for new users
   - Easier to test (clear success criteria per screen)
   - Aligns with modern SaaS UX trends

3. **Hybrid Approach (Rejected)**
   - Too complex to maintain multiple UI variants
   - Role boundaries often blur in practice (users have multiple roles)
   - Harder to test (need to test each variant)

## Consequences

### Positive

- **Faster Onboarding**: New users can start working immediately without training
- **Higher Engagement**: Users feel confident, not overwhelmed
- **Competitive Differentiation**: Stands out in enterprise GRC market
- **Easier Testing**: Each screen has clear primary goal, making acceptance criteria obvious
- **Better Accessibility**: Fewer elements per screen = easier keyboard navigation and screen reader support

### Negative

- **More Clicks for Power Users**: Advanced features may require navigating through menus
- **Risk of Hiding Features**: Important functionality could be buried if information architecture is poor
- **Design Discipline Required**: Every new feature must justify its prominence, leading to difficult prioritization discussions

### Neutral

- **Requires User Research**: We must validate navigation paths with real users to ensure we're not hiding critical features
- **Ongoing Iteration**: As new features are added, we must continuously refine information architecture

## Mitigation

To address the negative consequences:

1. **User Testing**: Conduct usability testing with 3-5 users per quarter to validate navigation paths
2. **Analytics**: Track click-through rates and time-to-complete for critical workflows
3. **Power User Mode**: Consider adding an optional "Advanced View" toggle for experienced users (but don't default to it)
4. **Keyboard Shortcuts**: Provide shortcuts for power users (e.g., `/` to open search, `g+d` to go to dashboard)
5. **Onboarding Checklist**: Guide new users through first tasks (e.g., "Set up your first SAP connection")

## Implementation Guidelines

### Example: Dashboard Page

**❌ BAD (Information Overload):**
```
Dashboard
├─ 12 KPI cards (Total Violations, Critical, High, Medium, Low, Users, ...)
├─ 5 charts (Trend over time, By department, By module, ...)
├─ 8 quick action buttons (Run Analysis, View Violations, Export Data, ...)
├─ System status panel (Database, SAP, Redis, Cache, Queue, ...)
└─ Recent activity feed (10+ items)
```

**✅ GOOD (Progressive Disclosure):**
```
Dashboard
├─ 4 Key Metrics (Total Violations, Critical Issues, Users Analyzed, Compliance Score)
├─ 1 Primary Action: "View Violations" (large, prominent button)
├─ 2 Secondary Actions: "Run New Analysis" | "View Reports" (smaller, less prominent)
├─ System Status: Database (green), SAP Connector (green), Last Analysis (2 hours ago)
    └─ Click for details → expands to full health check view
└─ No charts on main view (accessible via "Analytics" in nav)
```

### Example: Status Indicators

**❌ BAD (Unclear):**
```jsx
<span className="badge-green">Active</span>
```
User thinks: "Active means... the database is running? Or connected? Or healthy?"

**✅ GOOD (Actionable):**
```jsx
<StatusBadge status="success">
  Database Connected
</StatusBadge>
```
Or, if there's an error:
```jsx
<StatusBadge status="error">
  Database Connection Failed - <a href="/admin/config">Configure</a>
</StatusBadge>
```

## References

- [Don't Make Me Think by Steve Krug](https://sensible.com/dont-make-me-think/)
- [The Design of Everyday Things by Don Norman](https://www.nngroup.com/books/design-everyday-things/)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Progressive Disclosure (Nielsen Norman Group)](https://www.nngroup.com/articles/progressive-disclosure/)
