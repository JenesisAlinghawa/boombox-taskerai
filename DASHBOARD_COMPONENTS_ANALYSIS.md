# Dashboard Components Analysis & Styling Patterns

## Overview

The dashboard components follow a consistent design system with white cards, subtle borders, drop shadows, and color-coded visual patterns. This document provides guidance for replicating these patterns in analytics components.

---

## 1. COMPONENTS IDENTIFIED

### A. DashboardPageHeaderComponent.tsx

- **Purpose**: Top header showing greeting, date range, and current time
- **Key Props**: None (fetches user data internally)
- **Output**: Greeting message, formatted date range, timezone-aware time display

### B. DoThisFirst.tsx

- **Purpose**: Priority-focused task list using Zap icon
- **Key Props**: `tasks: Task[]`
- **Output**: Sorted task list with priority badges (high/medium/low)

### C. TasksDisplaySectionComponent.tsx

- **Purpose**: Individual task section container with status-specific styling
- **Key Props**: `tasks: Task[]`, `status: TaskStatus` (pending/inProgress/overdue/completed)
- **Output**: Single column of tasks with status-based colors and icons

### D. TaskStatusGridComponent.tsx

- **Purpose**: 2x2 grid layout combining 4 task status sections
- **Key Props**: Individual task arrays and numeric counts for each status
- **Output**: Four-column grid of TasksDisplaySectionComponent

### E. TaskSummaryOverviewComponent.tsx

- **Purpose**: Alternative "Do This First" component with compact layout
- **Key Props**: `tasks: Task[]`
- **Output**: Numbered priority list with amber/yellow accent

### F. TaskTimelineVisualizationComponent.tsx

- **Purpose**: Calendar view showing tasks by date with selection capability
- **Key Props**: `currentMonth`, `currentYear`, `setCurrentMonth`, `setCurrentYear`, `calendarTasks`
- **Output**: Month calendar with task indicators and detail modal

---

## 2. STYLING PATTERNS - CARD CONTAINERS

### Standard Card Container

```tsx
className="
  bg-white
  border border-gray-200
  rounded-xl
  shadow-sm
  overflow-hidden
  h-full
  flex
  flex-col
  transition-all
  duration-200
  hover:shadow-md
"
```

**Key Classes**:

- **Background**: `bg-white` (never off-white or gray)
- **Border**: `border border-gray-200` (subtle, 1px)
- **Corners**: `rounded-xl` (16px radius)
- **Shadow**: `shadow-sm` base, upgrades to `hover:shadow-md` on hover
- **Layout**: `flex flex-col h-full` (vertically stacked, fills height)
- **Transitions**: `transition-all duration-200` (smooth 200ms transitions)

### Gradient Card (Priority/Featured)

```tsx
// "Do This First" style - amber accent
className="
  bg-gradient-to-b from-amber-50 to-white
  border border-amber-200
  rounded-xl
  shadow-sm
  overflow-hidden
"

// Header uses:
className="... bg-amber-50/80 ..."
```

---

## 3. HEADER PATTERNS

### Card Header Structure

```tsx
<div className="px-4 py-2.5 border-b border-gray-300/50">
  <div className="flex items-center gap-2.5">
    <Icon size={18} className={iconColor} />
    <h2 className="text-sm font-medium text-gray-800">{label}</h2>
  </div>
  {/* Optional badge/count */}
  <span className="text-xs font-medium text-gray-700 bg-white/70 px-2.5 py-1 rounded-full shadow-sm">
    {count}
  </span>
</div>
```

**Key Patterns**:

- **Padding**: `px-4 py-2.5` (horizontal 16px, vertical 10px)
- **Border**: `border-b border-gray-300/50` (subtle bottom separator)
- **Icon**: Size 18px, specific color per status
- **Font**: `text-sm font-medium` for titles
- **Gap**: `gap-2.5` between icon and text (10px)
- **Count Badge**: `text-xs font-medium`, `bg-white/70`, `px-2.5 py-1`, `rounded-full`

### Content Area

```tsx
<div className="flex-1 overflow-y-auto p-2.5">{/* content */}</div>
```

**Key Pattern**:

- **Padding**: `p-2.5` (10px all sides)
- **Scrolling**: `flex-1 overflow-y-auto` (takes remaining height, scrollable)

---

## 4. COLOR CODING - STATUS SPECIFIC STYLES

### Color Palette by Status

Each status has 6 consistent properties:

```ts
const statusConfig = {
  pending: {
    label: "Pending",
    icon: Circle,
    iconColor: "text-purple-700",
    headerBg: "bg-purple-100",
    taskCardBg: "bg-purple-100",
    taskCardHover: "hover:bg-purple-200/80",
    taskCardBorder: "border-purple-200/60",
    taskCardHoverBorder: "hover:border-purple-300/70",
    accent: "border-l-4 border-purple-400/80",
    empty: "No pending tasks",
  },
  inProgress: {
    label: "In Progress",
    icon: Clock,
    iconColor: "text-blue-700",
    headerBg: "bg-blue-100",
    taskCardBg: "bg-blue-100",
    taskCardHover: "hover:bg-blue-200/80",
    taskCardBorder: "border-blue-200/60",
    taskCardHoverBorder: "hover:border-blue-300/70",
    accent: "border-l-4 border-blue-400/80",
    empty: "No tasks in progress",
  },
  overdue: {
    label: "Overdue",
    icon: AlertCircle,
    iconColor: "text-red-700",
    headerBg: "bg-red-100",
    taskCardBg: "bg-red-100",
    taskCardHover: "hover:bg-red-200/80",
    taskCardBorder: "border-red-200/60",
    taskCardHoverBorder: "hover:border-red-300/70",
    accent: "border-l-4 border-red-400/80",
    empty: "No overdue tasks",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    iconColor: "text-green-700",
    headerBg: "bg-green-100",
    taskCardBg: "bg-green-100",
    taskCardHover: "hover:bg-green-200/80",
    taskCardBorder: "border-green-200/60",
    taskCardHoverBorder: "hover:border-green-300/70",
    accent: "border-l-4 border-green-400/80",
    empty: "No completed tasks",
  },
};
```

**Color Pattern Rules**:

1. **100 suffix**: Light background (`bg-purple-100`, `bg-blue-100`, etc.)
2. **200 suffix**: Hover/lighter background (`hover:bg-blue-200/80`)
3. **300 suffix**: Border hover state (`hover:border-blue-300/70`)
4. **400 suffix**: Dark accent/icon (`text-blue-700`, `border-blue-400/80`)
5. **Opacity**: `80%` for secondary colors, `/60` for borders, `/70` for hover borders

**Accent Classes**:

- `border-l-4 border-[color]-400/80` - Left border accent highlighting (4px left border)

---

## 5. TASK CARD ITEM PATTERNS

### Task Card Container

```tsx
className="
  flex items-start gap-3.5
  bg-[status]100
  hover:bg-[status]200/80
  active:opacity-75
  transition-all duration-200
  cursor-pointer
  rounded-lg
  px-4 py-2.5
  border border-[status]200/60
  hover:border-[status]300/70
  hover:shadow-sm
"
```

**Key Spacings**:

- **Gap between items**: `gap-3.5` (14px)
- **Padding**: `px-4 py-2.5` (16px horizontal, 10px vertical)
- **Border radius**: `rounded-lg` (8px)
- **Icon-to-content gap**: `gap-3.5`

### Icon Styling

```tsx
<div className={`mt-1 ${config.accent}`}>
  <Icon size={18} className={`${config.iconColor} flex-shrink-0`} />
</div>
```

**Pattern**:

- **Size**: 18px
- **Margin-top**: `mt-1` (slight offset from top)
- **Shrinking**: `flex-shrink-0` (prevents collapse)
- **Color**: Status-specific (e.g., `text-purple-700`)
- **Accent border**: Added to icon container

### Content Section

```tsx
<div className="flex-1 min-w-0">
  <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>

  <div className="mt-1 text-xs text-gray-600 flex flex-wrap gap-x-3">
    {task.assigner && <span>by {task.assigner}</span>}
    {task.dueDate && <span>due {task.dueDate}</span>}
  </div>
</div>
```

**Pattern**:

- **Title**: `text-sm font-medium text-gray-900 truncate`
- **Metadata gap**: `mt-1` (4px spacing)
- **Meta text**: `text-xs text-gray-600`
- **Meta layout**: `flex flex-wrap gap-x-3` (horizontal wrapping, 12px gaps)
- **Overflow handling**: `min-w-0` on parent, `truncate` on title

### Priority Badge

```tsx
className={`
  text-xs px-2.5 py-1 rounded-full font-medium self-start mt-0.5 flex-shrink-0
  ${
    task.priority === "high"
      ? "bg-red-200/80 text-red-800"
      : task.priority === "medium"
        ? "bg-yellow-200/80 text-yellow-800"
        : "bg-green-200/80 text-green-800"
  }
`}
```

**Pattern**:

- **Text size**: `text-xs`
- **Padding**: `px-2.5 py-1` (10px horizontal, 4px vertical)
- **Shape**: `rounded-full` (fully rounded pill)
- **Font**: `font-medium`
- **Alignment**: `self-start mt-0.5` (top-aligned with slight top margin)
- **Shrinking**: `flex-shrink-0` (prevents width reduction)
- **High**: Red (`bg-red-200/80 text-red-800`)
- **Medium**: Yellow (`bg-yellow-200/80 text-yellow-800`)
- **Low**: Green (`bg-green-200/80 text-green-800`)

---

## 6. SPECIAL PATTERNS

### Empty State Pattern

```tsx
<div className="h-full flex items-center justify-center px-6 text-center">
  <div>
    <AlertCircle size={32} className="mx-auto text-gray-300 mb-2" />
    <p className="text-sm text-gray-500">No tasks to prioritize</p>
  </div>
</div>
```

**Features**:

- **Vertical centering**: `h-full flex items-center justify-center`
- **Icon**: 32px, gray-300 (very light)
- **Icon margin**: `mx-auto mb-2` (centered, 8px bottom margin)
- **Text**: `text-sm text-gray-500` (muted gray)

### Scrollable List Container

```tsx
<div className="flex-1 overflow-y-auto p-2.5">
  <div className="space-y-2">
    {items.map(item => (...))}
  </div>
</div>
```

**Pattern**:

- **Parent**: `flex-1 overflow-y-auto p-2.5` (fills height, scrollable, 10px padding)
- **List wrapper**: `space-y-2` (8px gap between items)

### Grid Layout - Status Grid

```tsx
<div className="grid grid-cols-2 gap-2 h-full w-full">{/* 4 sections */}</div>
```

**Pattern**:

- **Grid**: 2 columns (`grid-cols-2`)
- **Gap**: `gap-2` (8px gaps)
- **Size**: `h-full w-full` (expands to fill parent)

### Calendar Cell Pattern

```tsx
className={`
  relative h-16 flex flex-col items-center justify-center
  text-xs font-medium rounded-md border transition-all duration-150
  ${cellClass}
  ${hasTasks ? "cursor-pointer hover:shadow-sm" : "cursor-default"}
`}
```

**Pattern**:

- **Height**: `h-16` (64px square-ish cells)
- **Centering**: `flex flex-col items-center justify-center`
- **Position**: `relative` (for absolute positioned icons)
- **Font**: `text-xs font-medium`
- **Border radius**: `rounded-md` (8px)

---

## 7. DATA & PROPS PATTERNS

### Task Type Interface (Standard)

```ts
interface Task {
  id: string;
  title: string;
  priority?: "high" | "medium" | "low";
  dueDate?: string;
  status?: string;
  assigner?: string;
  createdBy?: { name?: string; email?: string };
  assignees?: Array<{ assignee?: { id: string } }>;
  assignee?: { id: string };
}
```

### Component Props Conventions

- **Arrays default to empty**: `tasks = []`
- **Optional props**: Use `?` for optional boolean/string props
- **User context**: `currentUser?: { id: string | number }`
- **Role-based**: `userRole?: "ADMIN" | "OWNER" | "EMPLOYEE"`

### Sorting/Filtering Pattern

```ts
const priorityScore = { high: 3, medium: 2, low: 1, stuck: 4 };

const sorted = [...array].sort((a, b) => {
  // Compare priority scores
  const aScore = priorityScore[a.priority] || 0;
  const bScore = priorityScore[b.priority] || 0;
  if (aScore !== bScore) return bScore - aScore;

  // Then compare dates
  if (a.dueDate && b.dueDate) {
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  }
  return 0;
});
```

---

## 8. TYPOGRAPHY PATTERNS

| Usage         | Class                                        | Details             |
| ------------- | -------------------------------------------- | ------------------- |
| Large heading | `text-2xl font-medium text-gray-900`         | 24px, medium weight |
| Card title    | `text-base font-medium text-gray-800`        | 16px, medium weight |
| Section title | `text-sm font-medium text-gray-800`          | 14px, medium weight |
| Task title    | `text-sm font-medium text-gray-900 truncate` | 14px, truncated     |
| Metadata      | `text-xs text-gray-600`                      | 12px, lighter gray  |
| Badge text    | `text-xs font-medium`                        | 12px, semibold      |
| Empty state   | `text-sm text-gray-500`                      | 14px, muted         |
| Tiny labels   | `text-[10px] font-medium text-gray-500`      | 10px, for calendar  |

---

## 9. SPACING/DIMENSION REFERENCE

### Padding Standards

- Card header: `px-4 py-2.5` (16px x 10px)
- Card content: `p-2.5` (10px all sides)
- Task items: `px-4 py-2.5` (16px x 10px)
- Badge: `px-2.5 py-1` (10px x 4px)

### Gaps/Margins

- Between sections: `gap-2` (8px)
- Between components: `gap-3.5` (14px)
- Between icon & text: `gap-2.5` (10px)
- Header bottom margin: `mb-2` (8px)
- Metadata top margin: `mt-1` (4px)
- Empty icon margin: `mb-2` (8px)

### Sizes (Icons)

- Full page icons: 32px
- Header icons: 16-18px
- Accent icons: 12-14px

---

## 10. HOVER & INTERACTION PATTERNS

### Card Hover

```tsx
transition-all duration-200 hover:shadow-md
// Results in shadow upgrade: shadow-sm → shadow-md
```

### Task Item Click

```tsx
cursor-pointer
active:opacity-75
transition-all duration-200
onClick={() => router.push(`/tasks?focus=${task.id}`)}
```

### Button Hover

```tsx
bg - white;
hover: bg - gray - 100;
transition - colors;
```

---

## 11. SUGGESTED PATTERNS FOR ANALYTICS COMPONENTS

Based on the dashboard analysis, here's how to replicate the patterns:

### For Analytics Chart Containers

```tsx
<div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden h-full flex flex-col transition-all duration-200 hover:shadow-md">
  {/* Header with title and icon */}
  <div className="px-4 py-2.5 border-b border-gray-300/50 bg-gray-50 flex items-center justify-between">
    <div className="flex items-center gap-2.5">
      <BarChart3 size={18} className="text-blue-600" />
      <h2 className="text-sm font-medium text-gray-800">Chart Title</h2>
    </div>
    {/* Optional controls/legend */}
  </div>

  {/* Chart content */}
  <div className="flex-1 overflow-auto p-4">{/* chart/data here */}</div>
</div>
```

### For Analytics Stats/Metric Cards

```tsx
<div className="bg-gradient-to-b from-blue-50 to-white border border-blue-200 rounded-xl shadow-sm p-4 flex flex-col">
  <div className="flex items-center gap-2.5 mb-3">
    <TrendingUp size={18} className="text-blue-600" />
    <h3 className="text-sm font-medium text-gray-900">Metric Name</h3>
  </div>
  <div className="text-2xl font-bold text-gray-900">{value}</div>
  <p className="text-xs text-gray-600 mt-2">{description}</p>
</div>
```

### For Analytics Data Tables

- Follow task card styling for table rows
- Use status color coding for column highlights
- Apply same hover/transition patterns
- Keep `px-4 py-2.5` padding for rows

---

## QUICK REFERENCE CHECKLIST

When creating analytics components, use:

✅ **Container**: `bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden h-full flex flex-col transition-all duration-200 hover:shadow-md`

✅ **Header**: `px-4 py-2.5 border-b border-gray-300/50 bg-gray-50 flex items-center gap-2.5`

✅ **Content Area**: `flex-1 overflow-y-auto p-2.5`

✅ **Color Status**: Purple/Blue/Red/Green with `[color]-100`/`[color]-200`/`[color]-700` pattern

✅ **Typography**: `text-sm font-medium text-gray-800` for titles

✅ **Spacing**: 10px (`2.5`), 8px (`2`), 14px (`3.5`) gaps

✅ **Icons**: 18px base size in headers, 16px for content

✅ **Empty State**: Icon (32px) + text centered with `flex items-center justify-center h-full`

✅ **Transitions**: `transition-all duration-200` for all interactive elements
