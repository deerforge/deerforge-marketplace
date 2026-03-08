---
name: brand-guidelines
description: DeerForge brand constitution - mandatory reference before ANY customer-facing design work, marketing materials, PDFs, presentations, or visual deliverables. Ensures brand consistency across all touchpoints.
---

# DeerForge Brand Guidelines

## ⚠️ MANDATORY PRE-TASK CHECKLIST

**BEFORE ANY customer-facing design work, ALWAYS:**

1. ✅ **READ THIS FILE FIRST** - No exceptions
2. ✅ **Verify color palette** - Use exact hex values below
3. ✅ **Check typography rules** - Inter + JetBrains Mono only
4. ✅ **Review tone guidelines** - Use approved vocabulary
5. ✅ **Confirm tagline** - "Where AI builders ship."
6. ✅ **Brand consistency check** - Does this match existing materials?

**❌ NEVER proceed with brand work without reading this file**
**❌ NEVER use generic/placeholder colors**
**❌ NEVER use unapproved fonts or terminology**

---

## Color Palette

### Primary Colors
```
Primary Dark:    #0D1117  (Near-black, GitHub dark theme inspired)
Secondary Dark:  #161B22  (Elevated surface, subtle contrast)
Accent Copper:   #D97757  (Warm amber/copper, unique in dev tools space)
```

### Supporting Colors
```
Background:      #FAF9F5  (Warm cream for light backgrounds)
Text Primary:    #0D1117  (Body text, high contrast)
Text Muted:      #64748B  (Captions, footnotes, secondary info)
Success:         #10B981  (Green for positive actions)
Warning:         #F59E0B  (Amber for alerts)
Error:           #EF4444  (Red for errors)
```

### Usage Rules
- **Primary Dark (#0D1117)**: Headers, main text, dark backgrounds
- **Accent Copper (#D97757)**: CTAs, highlights, brand accents, links
- **Secondary Dark (#161B22)**: Cards, elevated surfaces, subtle contrast
- **Background Cream (#FAF9F5)**: Light mode backgrounds, content areas
- **Never use**: Generic blues, forest greens, or gold colors from other projects

---

## Typography

### Font Stack
```
Headings:     Inter (Google Fonts)
Body Text:    Inter (Google Fonts) 
Code/Mono:    JetBrains Mono (Google Fonts)
```

### Weight & Size Hierarchy
```
H1 Title:     Inter 700 Bold, 48px (3rem)
H2 Section:   Inter 600 SemiBold, 36px (2.25rem)
H3 Subsection: Inter 600 SemiBold, 24px (1.5rem)
H4 Component: Inter 500 Medium, 20px (1.25rem)
Body Large:   Inter 400 Regular, 18px (1.125rem)
Body Regular: Inter 400 Regular, 16px (1rem)
Body Small:   Inter 400 Regular, 14px (0.875rem)
Caption:      Inter 400 Regular, 12px (0.75rem)
Code:         JetBrains Mono 400 Regular, 14px (0.875rem)
```

### Usage Rules
- **Never use**: System fonts, Arial, Helvetica, Times, or any other fonts
- **Line Height**: 1.5x for body text, 1.2x for headings
- **Letter Spacing**: Default (no custom tracking)
- **Code blocks**: Always use JetBrains Mono for consistency

---

## Brand Voice & Tone

### Core Personality
- **Professional yet approachable** - Technical depth without intimidation
- **Builder-focused** - Speaks to developers, makers, creators
- **Pragmatic** - Solutions over hype, results over promises
- **Confident** - Authoritative without arrogance

### Tagline
**Official**: "Where AI builders ship."
- Always use exactly this phrasing
- No variations or modifications
- Represents our marketplace positioning

### Approved Vocabulary

**✅ USE THESE TERMS:**
- Builders (not developers/users)
- Ship (deploy/launch)
- Forge (create/build)
- Skills (capabilities/tools)
- Swarms (agent groups)
- Workflows (processes)
- Marketplace (platform)
- Ecosystem (community)

**❌ AVOID THESE TERMS:**
- "Seamless" (overused in tech)
- "Revolutionary" (hyperbolic)
- "Game-changing" (cliché)
- "Cutting-edge" (generic)
- "Next-generation" (meaningless)
- "Innovative" (empty)
- "Disruptive" (overused)
- "Synergy" (corporate speak)

### Tone Examples
```
✅ Good: "Build and ship AI workflows that actually work."
❌ Bad: "Revolutionary seamless AI solutions for next-generation innovation."

✅ Good: "Join 1,000+ builders shipping AI skills daily."
❌ Bad: "Experience cutting-edge disruptive technology synergy."
```

---

## Visual Identity

### Logo Concept
**Current Status**: Development phase
**Direction**: Antler Network inspired - clean, geometric antler/branch motif
**Colors**: Primary Dark (#0D1117) with Accent Copper (#D97757) highlights
**Style**: Minimalist, developer-friendly, memorable at small sizes

### Logo Usage (When Ready)
- Minimum size: 32px height for digital
- Clear space: 2x logo height on all sides  
- Dark backgrounds: Use white version
- Light backgrounds: Use dark version
- Never stretch, rotate, or modify proportions

### Icon System
- **Style**: Outline icons, 2px stroke weight
- **Colors**: Match brand palette
- **Library**: Heroicons or Lucide for consistency

---

## Layout & Spacing

### Grid System
- **Desktop**: 12-column grid, 1200px max width
- **Mobile**: Single column, 16px side margins
- **Gutters**: 24px between columns

### Spacing Scale (Tailwind-compatible)
```
xs:  4px   (0.25rem)
sm:  8px   (0.5rem)
md:  16px  (1rem)
lg:  24px  (1.5rem)
xl:  32px  (2rem)
2xl: 48px  (3rem)
3xl: 64px  (4rem)
```

---

## Component Standards

### Buttons
```css
Primary:   bg-[#D97757] text-white hover:bg-[#C86A4A]
Secondary: bg-[#161B22] text-white hover:bg-[#21262D]
Outline:   border-[#D97757] text-[#D97757] hover:bg-[#D97757] hover:text-white
```

### Cards
```css
Background: bg-white or bg-[#FAF9F5]
Border:     border-[#161B22]/10
Shadow:     shadow-lg
Radius:     rounded-lg (8px)
```

### Code Blocks
```css
Background: bg-[#0D1117]
Text:       text-[#FAF9F5]
Font:       font-mono (JetBrains Mono)
Padding:    p-4
Radius:     rounded-md
```

---

## File Naming Conventions

### Images
```
deerforge-logo-dark.svg
deerforge-logo-light.svg
deerforge-icon-32.png
deerforge-favicon.ico
```

### Documents
```
deerforge-[product-name]-[version].pdf
deerforge-brand-guidelines.pdf
deerforge-style-guide.pdf
```

---

## Quality Standards

### Customer-Facing Materials Must Have:
1. **Correct color palette** - No exceptions
2. **Proper typography** - Inter + JetBrains Mono only  
3. **Brand-compliant copy** - Use approved vocabulary
4. **Professional polish** - No placeholder content
5. **Consistent spacing** - Follow grid system
6. **Accessibility** - WCAG 2.1 AA contrast ratios

### Brand Violations (Fix Immediately):
- Wrong colors (especially generic blues/greens)
- Wrong fonts (system fonts, Arial, etc.)
- Banned vocabulary ("seamless", "revolutionary")
- Inconsistent spacing or layout
- Poor contrast or readability
- Generic stock imagery

---

## Implementation Notes

### For PDFs & Documents
- Use exact hex colors: #0D1117, #161B22, #D97757
- Headers in Inter Bold, body in Inter Regular
- Code blocks in JetBrains Mono
- Maintain 1.5x line height for readability

### For Web Interfaces  
- Implement with CSS custom properties
- Use Tailwind classes with custom colors
- Ensure mobile responsiveness
- Test contrast ratios

### For Presentations
- Use brand colors in slide templates
- Maintain typography hierarchy
- Include DeerForge branding elements
- Follow spacing guidelines

---

## Contact & Approvals

**Brand Owner**: Io (AI CEO)
**Review Required**: Major brand changes, new logo concepts
**Quick Approvals**: Standard applications of existing guidelines
**Emergency Contact**: io@deerforge.io

---

*Last Updated: March 2026*
*Version: 1.0*
*Status: Active - All teams must follow*