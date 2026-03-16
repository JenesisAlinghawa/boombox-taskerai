# Quick Visual Reference: Dashboard vs Analytics Styling

## At a Glance

```
┌─ DASHBOARD STYLING ─────────────────────┐  ┌─ ANALYTICS STYLING ─────────────────────┐
│                                         │  │                                         │
│  Card Background:                       │  │  Card Background:                       │
│  ┌──────────────────────────────────┐ │  │  ┌──────────────────────────────────┐ │
│  │ WHITE bg-white                   │ │  │  │ BLUE TINTED bg-blue-100          │ │
│  │ border: gray-200                 │ │  │  │ border: black/10 + blur effect   │ │
│  │ rounded: XL (12px)               │ │  │  │ rounded: SM (4px)                │ │
│  │ shadow: sm                       │ │  │  │ shadow: none (has blur)          │ │
│  └──────────────────────────────────┘ │  │  └──────────────────────────────────┘ │
│                                         │  │                                         │
│  Header Styling:                        │  │  Header Styling:                        │
│  ┌──────────────────────────────────┐ │  │  ┌──────────────────────────────────┐ │
│  │ COLORED BACKGROUND:              │ │  │  │ MINIMAL / INHERITED:             │ │
│  │ ✓ bg-purple-100 (Pending)        │ │  │  │ • No separate background         │
│  │ ✓ bg-blue-100 (In Progress)      │ │  │  │ • Inherits container color       │ │
│  │ ✓ bg-red-100 (Overdue)           │ │  │  │ • border-b: black/10             │ │
│  │ ✓ bg-green-100 (Completed)       │ │  │  │ • Opacity text: text-black/62    │ │
│  │ border-b: gray-300/50            │ │  │  │ • Icons: colored (blue-600)      │ │
│  └──────────────────────────────────┘ │  │  └──────────────────────────────────┘ │
│                                         │  │                                         │
│  Text Colors:                           │  │  Text Colors:                           │
│  • Headings: text-gray-800/900         │  │  • All text: text-black/[%]            │
│  • Status: colored (purple-700, etc)   │  │  • Primary: text-black/62              │
│  • Links: semantic colors              │  │  • Secondary: text-black/40            │
│  └──────────────────────────────────┘   └──────────────────────────────────┘

┌─ NESTED CARDS (Task Cards) ─────────────┐  ┌─ NESTED CARDS (Metric Cards) ──────────┐
│                                         │  │                                         │
│  Each Status Card:                      │  │  Each Metric Card:                      │
│  ┌──────────────────────────────────┐ │  │  ┌──────────────────────────────────┐ │
│  │ bg-[status]-100 (solid)         │ │  │  │ bg-[color]-50 (very light)       │ │
│  │ border: [color]-200/60           │ │  │  │ border: [color]-200/30           │ │
│  │ ▌ LEFT ACCENT: border-l-4        │ │  │  │ (no left accent)                 │ │
│  │ rounded: lg                       │ │  │  │ rounded: sm                      │ │
│  │ shadow: sm                        │ │  │  │ (no shadow - parent has blur)    │ │
│  │ hover: shadow-md + lighter bg    │ │  │  │ hover: border-black/50           │ │
│  └──────────────────────────────────┘ │  │  └──────────────────────────────────┘ │
│                                         │  │                                         │
│ ADVANTAGES:                             │  │ ADVANTAGES:                             │
│ ✓ Clear status differentiation         │  │ ✓ Modern aesthetic                      │
│ ✓ Strong visual hierarchy              │  │ ✓ Subtle and elegant                    │
│ ✓ Easy to scan                         │  │ ✓ Layered appearance                    │
│ ✓ Familiar card design                 │  │ ✗ Less scannable                        │
│                                         │  │ ✗ Text harder to read (opacity)        │
└─────────────────────────────────────────┘  └─────────────────────────────────────────┘
```

---

## Side-by-Side Comparison Table

| Aspect                | Dashboard                       | Analytics                      |
| --------------------- | ------------------------------- | ------------------------------ |
| **Card Background**   | `bg-white`                      | `bg-blue-100`                  |
| **Main Border**       | `border-gray-200`               | `border-black/10`              |
| **Rounded Corners**   | `rounded-xl` (12px)             | `rounded-sm` (4px)             |
| **Shadow Effects**    | `shadow-sm` + `hover:shadow-md` | `backdrop-blur-md` (no shadow) |
| **Header Background** | Status-specific colored         | Inherits container color       |
| **Header Text**       | Solid dark gray                 | Opacity-based (text-black/62)  |
| **Card Text**         | Solid colors (text-gray-800)    | Opacity-based (text-black/62)  |
| **Priority Badges**   | Saturated colors (red-200)      | Lighter tints (red-100)        |
| **Accent Borders**    | Left border-l-4                 | None                           |
| **Icon Colors**       | Status-specific                 | Limited to blue/orange/red     |
| **Section Headers**   | Strongly differentiated         | Minimal styling                |

---

## Example: Status Card Styling

### Dashboard (TaskListSection)

```tsx
<div className="
  bg-white
  border border-gray-200
  rounded-xl
  overflow-hidden
  h-full
  flex
  flex-col
  shadow-sm
">
  < Header with status-specific bg >
  bg-purple-100  // for Pending

  < Task card inside >
  bg-purple-100
  border border-purple-200/60
  border-l-4 border-purple-400/80  // LEFT ACCENT
  rounded-lg

  < Task title >
  text-gray-900  // solid color
```

### Analytics (AnalyticsStatusCards)

```tsx
<div className="
  bg-gradient-to-br from-purple-500/20 to-purple-600/20
  backdrop-blur-md
  rounded-sm
  border border-black/10
  p-4
  hover:border-black/50
">
  < Icon + Count >
  text-black/62  // opacity-based
  text-2xl font-bold
```

---

## Key CSS Classes Mapping

### Replace These...

| Current                  | Suggested                |
| ------------------------ | ------------------------ |
| `bg-blue-100`            | `bg-white`               |
| `border border-black/10` | `border border-gray-200` |
| `rounded-sm`             | `rounded-lg`             |
| `backdrop-blur-md`       | `shadow-sm`              |
| `text-black/62`          | `text-gray-800`          |
| `text-black/40`          | `text-gray-600`          |
| `border-black/50` hover  | `border-gray-400` hover  |

### Add These...

| Element         | CSS                                |
| --------------- | ---------------------------------- |
| Cards           | `shadow-sm`                        |
| Cards on hover  | `hover:shadow-md`                  |
| Rounded corners | `rounded-lg` or `rounded-xl`       |
| Status headers  | Status-specific `bg-[color]-100`   |
| Task accents    | `border-l-4 border-[color]-400/80` |

---

## Visual Card Comparison

```
DASHBOARD CARD:
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🟣 PENDING      [3]        ┃  ← purple-100 header
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ ▌🟣 Task Title          ┃  ← left accent (border-l-4)
┃   By John • Due 3/15     ◇ high  ┃  ← purple-100 bg
┠─────────────────────────┨
┃ ▌🟣 Another Task         ┃  ← shadow-sm on card
┃   By Jane • Due 3/17   ◇ med ┃  ← hover:shadow-md
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
   └─ gap-2 between adjacent cards

ANALYTICS CARD:
┌─────────────────────────────┐
│ 📊 Task Execution Summary   │  ← minimal header
├─────────────────────────────┤
│ ░░ PENDING    ███ 30%      │  ← blue-100 bg
│ ░░ IN PROG    ███ 40%      │  ← no accent border
│ ░░ COMPLETED ███ 20%       │  ← backdrop-blur-md
│ ░░ OVERDUE    ███ 10%      │  ← text-black/62
└─────────────────────────────┘
   └─ nested cards with opacity text
```

---

## Implementation Priority

When updating Analytics to match Dashboard, apply changes in this order:

### Priority 1: Container Styling

- [ ] Replace `bg-blue-100` → `bg-white`
- [ ] Replace `border-black/10` → `border-gray-200`
- [ ] Remove `backdrop-blur-md`
- [ ] Add `shadow-sm`

### Priority 2: Text Colors

- [ ] Replace `text-black/62` → `text-gray-800`
- [ ] Replace `text-black/40` → `text-gray-600`
- [ ] Replace `text-black/50` → `text-gray-700`

### Priority 3: Visual Enhancements

- [ ] Increase `rounded-sm` → `rounded-lg`
- [ ] Add status-specific header backgrounds
- [ ] Add left border accents to task cards
- [ ] Add `hover:shadow-md` effects

### Priority 4: Nested Components

- [ ] Update nested card background colors
- [ ] Align border opacity and colors
- [ ] Standardize padding and spacing

---

## Common Tailwind Utility Conversions

### Borders

```
Dashboard:  border border-gray-200
Analytics:  border border-black/10
Replace with: border border-gray-200
```

### Text Color

```
Dashboard:  text-gray-800
Analytics:  text-black/62
Convert: text-black/62 = ~50% opacity black = ~gray-500
Better:  text-gray-800 (solid color)
```

### Shadows

```
Dashboard:  shadow-sm hover:shadow-md transition-all duration-200
Analytics:  backdrop-blur-md (no shadow)
Add: shadow-sm hover:shadow-md transition-all duration-200
```

### Rounded Corners

```
Dashboard:  rounded-xl (12px)
Analytics:  rounded-sm (4px)
Increase: rounded-xl for major containers, rounded-lg for cards
```

---

## Color Palette Alignment

### Status Colors (Use Consistently)

```
Pending:     #F3E8FF bg  #8B5CF6 icon  #7C3AED text
In Progress: #DBEAFE bg  #3B82F6 icon  #1D4ED8 text
Completed:   #D1FAE5 bg  #10B981 icon  #047857 text
Overdue:     #FEE2E2 bg  #EF4444 icon  #DC2626 text
```

### Neutral Colors (Dashboard)

```
Text Primary:      #111827 (gray-900)
Text Secondary:    #374151 (gray-700)
Text Tertiary:     #6B7280 (gray-600)
Borders:           #E5E7EB (gray-200)
Backgrounds:       #FFFFFF (white)
```

### What to Avoid (Analytics pattern)

```
❌ text-black/62  (52% opacity = unreadable)
❌ text-black/40  (60% opacity = too light)
❌ border-black/10 (not enough contrast)
✓ Use solid colors instead
```
