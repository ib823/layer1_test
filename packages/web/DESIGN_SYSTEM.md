# Prism - Design System Package

**Complete setup for enforcing design consistency with Claude Code and human developers**

---

## 📦 What's in This Package

You've received **4 essential files** to enforce your ABeam design system:

### 1. **tokens.css** ⭐ CRITICAL
The heart of your design system. Contains all ABeam brand colors, spacing, typography, and design tokens.

**Where to add:** `packages/web/src/styles/tokens.css`

**What it includes:**
- ABeam brand colors (#0C2B87, #1E3A8A, #3B82F6)
- Risk level colors (Critical, High, Medium, Low)
- Typography (Inter font)
- Spacing scale (8px base)
- Border radius, shadows, z-index
- Responsive breakpoints

---

### 2. **.clauderc** ⭐ CRITICAL
Configuration file that tells Claude Code exactly how to follow your design system.

**Where to add:** `packages/web/.clauderc`

**What it does:**
- Lists all available UI components
- Defines mandatory design rules
- Specifies forbidden patterns (hardcoded colors, Segoe UI font, etc.)
- Provides component usage examples
- Sets workflow for creating new components

---

### 3. **DESIGN_SYSTEM_IMPLEMENTATION_GUIDE.md** ⭐ CRITICAL
Complete implementation guide with step-by-step instructions, code examples, and best practices.

**Where to add:** `packages/web/DESIGN_SYSTEM.md`

**What it contains:**
- Design token usage guide
- Component library reference
- Tailwind configuration
- ESLint setup for design enforcement
- Color usage rules
- Forbidden patterns
- Troubleshooting guide

---

### 4. **SETUP_CHECKLIST.md** ⭐ HIGH PRIORITY
Quick-start guide with 15-minute setup and full 2-3 hour implementation plan.

**Where to use:** Reference for implementation

**What it includes:**
- Quick setup (15 minutes)
- Full setup (2-3 hours)
- Verification checklist
- Common issues & solutions
- Success metrics

---

## 🚀 Quick Start (15 Minutes)

### Step 1: Add Design Tokens
```bash
# From your project root
cp tokens.css packages/web/src/styles/tokens.css
```

Then import in `packages/web/src/app/globals.css`:
```css
@import './styles/tokens.css';
```

---

### Step 2: Add Claude Code Config
```bash
cp .clauderc packages/web/.clauderc
```

---

### Step 3: Update Tailwind
Update `packages/web/tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'var(--brand-primary)',
          secondary: 'var(--brand-secondary)',
          accent: 'var(--brand-accent)',
        },
        risk: {
          critical: 'var(--risk-critical)',
          high: 'var(--risk-high)',
          medium: 'var(--risk-medium)',
          low: 'var(--risk-low)',
        },
      },
      fontFamily: {
        sans: ['var(--font-family)'],
      },
    },
  },
  plugins: [],
};

export default config;
```

---

### Step 4: Add Inter Font
In `packages/web/src/app/layout.tsx`:
```tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

---

### Step 5: Test It
```bash
cd packages/web
npm run dev
```

Open browser and check:
- ✅ Inter font is loading
- ✅ Brand colors are working
- ✅ Components use design tokens

---

## 🎯 What This Achieves

### For Claude Code
✅ **Automatically follows design system** - No manual reminders needed  
✅ **Uses existing components** - Won't recreate Button/Badge/Card  
✅ **Enforces color rules** - Only uses design tokens  
✅ **Maintains consistency** - All code follows same patterns  

### For Developers
✅ **Clear guidelines** - DESIGN_SYSTEM.md explains everything  
✅ **Lint enforcement** - Can't commit hardcoded colors  
✅ **Fast development** - Reuse components, don't rebuild  
✅ **Easy onboarding** - New devs learn system quickly  

### For Design Team
✅ **Brand consistency** - ABeam colors used everywhere  
✅ **No violations** - Linting catches mistakes  
✅ **Less review time** - System enforces rules  
✅ **Scalable** - Works for 1 or 100 developers  

---

## 📁 File Structure After Setup

```
packages/web/
├── .clauderc                          # ← ADD THIS (Claude Code config)
├── DESIGN_SYSTEM.md                   # ← ADD THIS (Usage guide)
├── tailwind.config.ts                 # ← UPDATE (Add design tokens)
├── src/
│   ├── styles/
│   │   ├── tokens.css                 # ← ADD THIS (Design tokens)
│   │   ├── design-system.css          # ✓ Already exists
│   │   └── globals.css                # ← UPDATE (Import tokens.css)
│   ├── components/
│   │   └── ui/
│   │       ├── Button.tsx             # ✓ Already exists
│   │       ├── Badge.tsx              # ✓ Already exists
│   │       ├── Card.tsx               # ✓ Already exists
│   │       └── index.ts               # ✓ Already exists
│   └── app/
│       └── layout.tsx                 # ← UPDATE (Add Inter font)
```

---

## 🎨 Design Token Usage

### Colors

**Before (BAD):**
```tsx
<div style={{ backgroundColor: '#0C2B87' }}>
  Prism
</div>
```

**After (GOOD):**
```tsx
<div className="bg-brand-primary text-white">
  Prism
</div>
```

---

### Badges

**Before (BAD):**
```tsx
<span style={{ 
  background: '#FEE2E2', 
  color: '#DC2626' 
}}>
  CRITICAL
</span>
```

**After (GOOD):**
```tsx
import { Badge } from '@/components/ui/Badge';

<Badge variant="critical">CRITICAL</Badge>
```

---

### Buttons

**Before (BAD):**
```tsx
<button 
  style={{ 
    backgroundColor: '#0C2B87',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '6px'
  }}
>
  Click Me
</button>
```

**After (GOOD):**
```tsx
import { Button } from '@/components/ui/Button';

<Button variant="primary">Click Me</Button>
```

---

## 🤖 How Claude Code Uses This

### When Creating Components

1. **Reads `.clauderc`** → Gets list of available components
2. **Checks `DESIGN_SYSTEM.md`** → Understands usage patterns
3. **Imports existing components** → Uses Button, Badge, Card, etc.
4. **Uses design tokens** → `bg-brand-primary` not `#0C2B87`
5. **Adds TypeScript types** → Proper type safety
6. **Tests responsiveness** → Mobile, tablet, desktop
7. **Validates accessibility** → WCAG AAA compliance

### What Claude Code Won't Do

❌ Create custom button implementations  
❌ Use hardcoded colors  
❌ Use Segoe UI font  
❌ Skip accessibility attributes  
❌ Forget mobile responsiveness  
❌ Use inline styles for colors  
❌ Create duplicate components  

---

## 🔧 Full Implementation (2-3 Hours)

For complete setup including ESLint rules, pre-commit hooks, and team training:

**See:** `SETUP_CHECKLIST.md`

This includes:
- ESLint configuration for design enforcement
- Pre-commit hooks
- CI/CD integration
- Team training materials
- Verification checklist

---

## 📊 Verification

After setup, verify with these commands:

```bash
cd packages/web

# Check design system compliance
npm run lint:design

# Build project
npm run build

# Start dev server
npm run dev
```

**Expected results:**
- ✅ No lint errors
- ✅ Inter font loads
- ✅ Brand colors work
- ✅ Components render correctly

---

## 📚 Documentation Hierarchy

### For Quick Reference
1. **Start here:** `SETUP_CHECKLIST.md` (15-min quickstart)

### For Implementation
2. **Main guide:** `DESIGN_SYSTEM_IMPLEMENTATION_GUIDE.md` (Complete setup)

### For Daily Use
3. **Component reference:** Your existing `/src/components/ui/` folder
4. **Design tokens:** `tokens.css` (All colors, spacing, fonts)

### For Claude Code
5. **AI config:** `.clauderc` (Automatic enforcement)

---

## ✅ Success Checklist

After implementation, you should have:

**Design System:**
- [ ] tokens.css with ABeam brand colors
- [ ] Tailwind configured with design tokens
- [ ] Inter font loaded
- [ ] All components use design tokens
- [ ] No hardcoded colors in codebase

**Claude Code:**
- [ ] .clauderc configuration file
- [ ] DESIGN_SYSTEM.md documentation
- [ ] Claude Code follows design rules automatically
- [ ] Claude Code reuses existing components

**Enforcement:**
- [ ] ESLint design rules configured
- [ ] `npm run lint:design` catches violations
- [ ] Pre-commit hooks validate design
- [ ] CI/CD checks design compliance

**Team:**
- [ ] Documentation shared with team
- [ ] Examples page created
- [ ] Team trained on design system
- [ ] Zero resistance to adoption

---

## 🎯 Expected Outcomes

### Week 1
- ✅ All new components follow design system
- ✅ 0 hardcoded colors added
- ✅ Claude Code uses existing components
- ✅ Team understands design rules

### Month 1
- ✅ 100% design token usage
- ✅ Consistent component patterns
- ✅ Fast development (component reuse)
- ✅ Reduced design review time by 80%

### Month 3
- ✅ Zero design system violations
- ✅ Scalable to any team size
- ✅ Easy onboarding for new devs
- ✅ Production-ready design system

---

## 🚨 Common Issues & Solutions

### Issue 1: "Colors not working"

**Check:**
1. Is `tokens.css` imported in `globals.css`?
2. Is `tailwind.config.ts` updated?
3. Clear cache: `rm -rf .next && npm run dev`

---

### Issue 2: "Claude Code not following rules"

**Check:**
1. Is `.clauderc` in `packages/web/.clauderc`?
2. Does `DESIGN_SYSTEM.md` exist?
3. Restart Claude Code

---

### Issue 3: "Lint errors everywhere"

**Solution:**
```bash
# Fix auto-fixable issues
npm run lint:design -- --fix

# Fix remaining issues manually
npm run lint:design
```

---

## 💡 Pro Tips

### Tip 1: Start Small
Begin with the 15-minute Quick Start. Don't try to do everything at once.

### Tip 2: Audit Incrementally
Fix existing components gradually. Focus on new code first.

### Tip 3: Create Examples
Build a demo page (`/design-system-demo`) showing all components.

### Tip 4: Train the Team
Spend 15 minutes showing the team how to use the design system.

### Tip 5: Enforce in CI/CD
Add `npm run lint:design` to your CI pipeline.

---

## 🆘 Need Help?

### Quick Answers
- **"How do I use a color?"** → Use Tailwind: `bg-brand-primary`
- **"How do I create a button?"** → Import: `<Button variant="primary">`
- **"How do I add new colors?"** → Update `tokens.css` (requires approval)
- **"Where are the components?"** → `/src/components/ui/`

### Resources
- Design System Guide: `DESIGN_SYSTEM_IMPLEMENTATION_GUIDE.md`
- Quick Setup: `SETUP_CHECKLIST.md`
- Design Tokens: `tokens.css`
- Claude Config: `.clauderc`

---

## 📈 Measuring Success

Track these metrics:

**Code Quality:**
- Number of lint violations (target: 0)
- Hardcoded colors (target: 0)
- Component reuse rate (target: 80%+)

**Development Speed:**
- Time to create new page (target: 50% faster)
- Design review time (target: 80% reduction)
- Bug fixes related to styling (target: 90% reduction)

**Team Adoption:**
- Developers trained (target: 100%)
- Documentation views (track in analytics)
- Questions about design system (target: <5/week)

---

## ✨ Summary

**What You Have:**
1. Complete design token system (colors, spacing, fonts)
2. Claude Code configuration for automatic enforcement
3. Comprehensive documentation
4. Quick setup guide (15 minutes)
5. Full implementation plan (2-3 hours)

**What This Achieves:**
- 🎨 Consistent ABeam branding everywhere
- 🤖 AI follows design system automatically
- 🚫 Prevents design violations
- ✅ Enforced through linting
- 📈 Faster development
- 🎓 Easy team onboarding

**Time Investment:**
- Quick setup: 15 minutes
- Full setup: 2-3 hours
- ROI: Saves 10+ hours/week

**Next Step:**
Open `SETUP_CHECKLIST.md` and follow the 15-minute Quick Start!

---

**Questions?** Review the documentation files or contact the design team.

**Ready to start?** Begin with the Quick Start section above! 🚀

---

**Package Version:** 1.0.0  
**Created:** October 8, 2025  
**For:** Prism Platform  
**Status:** ✅ Production Ready