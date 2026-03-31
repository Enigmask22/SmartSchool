# Page Header Standard Pattern

## Overview

Establish a **unified, reusable header component** for all pages in SmartSchool. This ensures:
- ✓ Consistent visual design across all pages
- ✓ Predictable spacing (no layout shifts)
- ✓ Responsive behavior (responsive at all breakpoints)
- ✓ Proper loading states with skeleton matching
- ✓ Clear separation of concerns (title + controls)

---

## Current Issues

### In `Header.tsx` (Homeroom Dashboard)

1. **Layout Instability**
   ```jsx
   <div className="flex items-start justify-between gap-4">
     {/* Title on left */}
     <div>...</div>
     
     {/* Controls on right */}
     {loading ? <SkeletonsRow /> : <SelectsRow />}
   </div>
   ```
   - `items-start` causes misalignment when title is multiline
   - `gap-4` is inconsistent with page padding
   - Controls section doesn't stack on mobile
   - Skeleton widths (`w-40`, `w-48`, `w-24`, `w-32`) may not match actual Select widths

2. **No Responsive Breakpoints**
   - On mobile: Title + 4 selects in one row = cluttered
   - Filters should stack below title on mobile

3. **Inconsistent with Other Pages**
   - ClassManagement, StudentList, etc. use `Card` with `CardHeader`
   - Header.tsx doesn't follow this pattern

4. **Skeleton Mismatch**
   - Skeleton: `w-40, w-48, w-24, w-32` (fixed widths)
   - Actual: Select components with `min-w-[160px]`, `min-w-[200px]`, etc.
   - Risk of layout shift when loading completes

---

## Recommended Standard Header Pattern

### Component Architecture

```
PageHeader (new standardized component)
├── TitleSection (left)
│   ├── icon (optional)
│   ├── title (h1)
│   └── description (p)
├── ControlsSection (right, responsive)
│   └── filters/actions (flexible layout)
└── LoadingState
    └── matching skeletons
```

### File Structure
```
src/components/
├── common/
│   ├── PageHeader/
│   │   ├── PageHeader.tsx          (main component)
│   │   ├── PageHeaderTitle.tsx      (title sub-component)
│   │   ├── PageHeaderControls.tsx   (controls sub-component)
│   │   ├── PageHeaderSkeleton.tsx   (loading state)
│   │   └── index.ts
```

---

## Detailed Component Specifications

### 1. PageHeader.tsx (Main Component)

**Purpose**: Root layout component combining all sections

```jsx
interface PageHeaderProps {
  // Title section
  title: string;
  description?: string;
  icon?: React.ReactNode;
  
  // Controls section
  children?: React.ReactNode;  // Filters/actions go here
  
  // Loading state
  loading?: boolean;
  skeletonCount?: number;  // Number of skeleton controls (default: 3)
  
  // Styling
  variant?: 'default' | 'card';  // Card variant wraps in Card, default is plain
  className?: string;
}
```

**Layout Structure**:
```
Desktop (lg breakpoint):
┌─────────────────────────────────────────────────────┐
│ Title          Icon                    [Filter] [X] │
│ Description                               [X]      │
└─────────────────────────────────────────────────────┘

Mobile (md breakpoint):
┌──────────────────────┐
│ Title          [Icon]│
│ Description        │
├──────────────────────┤
│ [Filter] [Filter]    │
│ [Filter]             │
└──────────────────────┘
```

**CSS Pattern**:
```jsx
<div className="space-y-4">
  {/* Title Section */}
  <div className="flex items-center justify-between gap-6 lg:items-end">
    <div className="flex-1">
      <div className="flex items-center gap-3">
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      </div>
      {description && (
        <p className="mt-2 text-gray-600">{description}</p>
      )}
    </div>

    {/* Controls Section - responsive */}
    <div className="hidden lg:block">
      {loading ? renderSkeletons() : <>{children}</>}
    </div>
  </div>

  {/* Mobile Controls - shown below on smaller screens */}
  <div className="block lg:hidden">
    {loading ? renderSkeletons() : <>{children}</>}
  </div>
</div>
```

---

### 2. PageHeaderControls.tsx (Controls Wrapper)

**Purpose**: Provides consistent flex layout for filter groups

```jsx
interface PageHeaderControlsProps {
  direction?: 'row' | 'col';  // row: horizontal, col: vertical (mobile)
  spacing?: 'sm' | 'md' | 'lg';  // gap between controls
  children: React.ReactNode;
}
```

**Usage**:
```jsx
<PageHeader
  title="Dashboard chủ nhiệm"
  description="Theo dõi và quản lý học sinh"
  loading={loading}
>
  <PageHeaderControls direction="row" spacing="md">
    <FilterSelect 
      label="Năm học"
      value={year}
      onChange={setYear}
      options={yearOptions}
      className="min-w-[160px]"
    />
    <FilterSelect 
      label="Lớp"
      value={class}
      onChange={setClass}
      options={classOptions}
      className="min-w-[200px]"
    />
  </PageHeaderControls>
</PageHeader>
```

---

### 3. Skeleton Loading Pattern

**Issue**: Skeleton widths must EXACTLY match rendered control widths

**Solution**: Use semantic width classes, not arbitrary widths

```jsx
// BEFORE (current - breaks on Select render)
<Skeleton className="w-40 h-10" />   // w-40 = 160px (unlikely to match)
<Skeleton className="w-48 h-10" />

// AFTER (matches Select min-width)
<Skeleton className="min-w-[160px] h-10 rounded-md" />
<Skeleton className="min-w-[200px] h-10 rounded-md" />
```

**Dynamic Skeleton Sizing**:
```jsx
interface SkeletonControlProps {
  width?: 'small' | 'medium' | 'large';  // Predefined sizes
  label?: string;  // Optional: show label skeleton too
}

// Small: min-w-[100px]  (month/year selects)
// Medium: min-w-[160px] (academic year)
// Large: min-w-[200px]  (class select with icon)
```

---

## Specific Recommendations for Homeroom Dashboard Header

### Current Issues to Fix

1. **Prop Drilling**: 14 props to Header.tsx
   
   **Current**:
   ```jsx
   <Header
     selectedClass={selectedClass}
     selectedClassId={selectedClassId}
     selectedAcademicYear={selectedAcademicYear}
     selectedMonth={selectedMonth}
     selectedYear={selectedYear}
     academicYears={academicYears}
     teacherClasses={teacherClasses}
     onClassChange={handleClassChange}
     onAcademicYearChange={setSelectedAcademicYear}
     onMonthChange={setSelectedMonth}
     onYearChange={setSelectedYear}
     loading={loading}
   />
   ```

   **After Refactor**:
   ```jsx
   <PageHeader 
     title="Dashboard chủ nhiệm" 
     description={`Lớp ${selectedClass || 'Đang tải...'}`}
     loading={loading}
   >
     <PageHeaderControls>
       {/* Only 4 filter controls, self-contained */}
     </PageHeaderControls>
   </PageHeader>
   ```

2. **Layout Shift on Mobile**
   
   **Current**: All controls in one row, wraps badly
   
   **Recommended**:
   ```
   Desktop (lg):
   ┌──────────────────────────────────────┐
   │ Dashboard chủ nhiệm    [Năm] [Lớp]   │
   │ Lớp 10A            [Tháng] [Năm]     │
   └──────────────────────────────────────┘

   Tablet (md):
   ┌──────────────────────────────────────┐
   │ Dashboard chủ nhiệm   [Năm] [Lớp]    │
   │ Lớp 10A            [Tháng] [Năm]     │
   └──────────────────────────────────────┘

   Mobile (sm):
   ┌────────────────────┐
   │ Dashboard chủ nhiệm│
   │ Lớp 10A            │
   ├────────────────────┤
   │ [Năm học]          │
   │ [Lớp]              │
   │ [Tháng] [Năm]      │
   └────────────────────┘
   ```

3. **Skeleton Width Mismatch**
   
   **Actions**:
   - Academic Year Select: `min-w-[160px]` → Skeleton: `min-w-[160px]`
   - Class Select: `min-w-[200px]` → Skeleton: `min-w-[200px]`
   - Month Select: `w-[100px]` → Skeleton: `min-w-[100px]`
   - Year Select: `w-[120px]` → Skeleton: `min-w-[120px]`

---

## Implementation Steps

### Phase 1: Create Standard Header Component

1. **Create new files**:
   ```
   src/components/common/PageHeader/
   ├── PageHeader.tsx
   ├── PageHeaderTitle.tsx
   ├── PageHeaderControls.tsx
   ├── PageHeaderSkeleton.tsx
   └── index.ts
   ```

2. **Implement PageHeader** with:
   - Responsive layout (row on lg+, col on md-)
   - Proper spacing (consistent with page padding)
   - Loading state support
   - TypeScript types

3. **Create PageHeaderSkeleton** with:
   - Dynamic control count
   - Matching widths (configurable)
   - Proper heights (h-10 for selects)

---

### Phase 2: Refactor Homeroom Header.tsx

1. **Break down current Header.tsx** into:
   - Title display (simple text)
   - Filter controls (self-contained)

2. **Move filters to Dashboard level**:
   ```jsx
   // Dashboard.tsx
   <PageHeader 
     title="Dashboard chủ nhiệm"
     description={`Lớp ${selectedClass}`}
     loading={loading}
   >
     {/* Move filter selects here, self-managed */}
     <AcademicYearSelect value={year} onChange={setYear} />
     <ClassSelect value={class} onChange={setClass} />
     <MonthSelect value={month} onChange={setMonth} />
     <YearSelect value={year} onChange={setYear} />
   </PageHeader>
   ```

3. **Remove Header.tsx** (no longer needed as separate component)

---

### Phase 3: Apply to Other Pages

Apply same pattern to:
- ✓ Homeroom Dashboard (currently in progress)
- ClassManagement
- StudentList  
- AdminDashboard
- etc.

Each follows same structure:
```jsx
<PageHeader 
  title="Page Title"
  description="Subtitle or status"
  loading={isLoading}
  icon={<IconComponent />}
>
  {/* Page-specific controls */}
</PageHeader>
```

---

## Design Specifications

### Colors & Typography

**Title Section**:
- Title: `text-3xl font-bold text-gray-900`
- Description: `text-gray-600 text-sm`
- Icon: `text-primary` or `text-gray-500`

**Controls Section**:
- Gap between controls: `gap-3` or `gap-4`
- Select triggers: `min-h-10` (40px)
- Label text: `text-sm text-gray-500`

**Loading State**:
- Skeleton height: `h-10` (matches select height)
- Skeleton border: `rounded-md` (matches select border-radius)
- Skeleton color: `bg-gray-200` (standard)

### Spacing Standards

| Level | Value | Usage |
|-------|-------|-------|
| Outer padding | `p-6` | Page container |
| Header vertical gap | `space-y-4` | Title section + controls |
| Control horizontal gap | `gap-3` or `gap-4` | Between filters |
| Title-to-control margin | `lg:gap-6` | Left-right separation |

### Responsive Breakpoints

```
Mobile (< 768px):
- Controls stack vertically below title
- Full-width selects or constrained width
- Single column layout

Tablet (768px - 1024px):
- Controls in 2-row grid if multiple
- Title and some controls on same row possible

Desktop (> 1024px):
- Title on left, controls on right (flexbox space-between)
- Horizontal stacking of controls
```

---

## Skeleton Matching Formula

**For any control**, skeleton width = control `min-width` or actual width

```jsx
// Example: Academic Year Select
// Actual control:
<SelectTrigger className="min-w-[160px]" />

// Skeleton:
<Skeleton className="min-w-[160px] h-10 rounded-md" />
```

**Verification checklist**:
- [ ] Control has explicit width class (`min-w-*` or `w-*`)
- [ ] Skeleton uses same width class
- [ ] Height matches control height (usually `h-10`)
- [ ] Border radius matches (`rounded-md` typically)
- [ ] Test on slow network to verify no shift

---

## Code Examples

### Example 1: Simple Header (Title + Description)

```jsx
<PageHeader
  title="Danh sách học sinh"
  description="Quản lý thông tin học sinh toàn trường"
  icon={<Users className="w-8 h-8 text-primary" />}
  loading={isLoadingStudents}
/>
```

### Example 2: Header with Filters (Homeroom)

```jsx
<PageHeader
  title="Dashboard chủ nhiệm"
  description={`Lớp ${selectedClass || 'Chọn lớp...'}`}
  loading={loading}
>
  <PageHeaderControls spacing="md">
    <FilterSelect
      label="Năm học"
      value={academicYear}
      onChange={setAcademicYear}
      options={academicYears}
      width="medium"  // min-w-[160px]
    />
    <FilterSelect
      label="Lớp"
      value={selectedClass}
      onChange={handleClassChange}
      options={teacherClasses}
      width="large"   // min-w-[200px]
    />
    <FilterSelect
      label="Tháng"
      value={month}
      onChange={setMonth}
      options={[1,2,3...12]}
      width="small"   // min-w-[100px]
    />
    <FilterSelect
      label="Năm"
      value={year}
      onChange={setYear}
      options={[2024, 2025, 2026]}
      width="small"   // min-w-[120px]
    />
  </PageHeaderControls>
</PageHeader>
```

### Example 3: Header with Action Buttons

```jsx
<PageHeader
  title="Admin Management"
  description="System configuration and management"
  icon={<Settings className="w-8 h-8 text-primary" />}
  loading={isLoadingConfig}
>
  <PageHeaderControls direction="row" spacing="md">
    <Button variant="outline" size="sm">
      <Download className="w-4 h-4" />
      Export
    </Button>
    <Button variant="default" size="sm">
      <Plus className="w-4 h-4" />
      Add New
    </Button>
  </PageHeaderControls>
</PageHeader>
```

---

## Migration Checklist

### For Each Page Using Header:

- [ ] Identify header component or inline header
- [ ] Extract title, description, icon, controls
- [ ] Create `PageHeader` wrapper
- [ ] Move filters to `PageHeaderControls`
- [ ] Verify skeleton widths match actual control widths
- [ ] Test responsive layout (mobile, tablet, desktop)
- [ ] Check for layout shifts during loading
- [ ] Remove old Header component if page-specific
- [ ] Update imports to use new `PageHeader`

---

## Benefits of This Pattern

✓ **Consistency**: All pages follow same header structure  
✓ **Reusability**: Single `PageHeader` component replaces 5+ page-specific headers  
✓ **Maintainability**: Changes to header design apply everywhere  
✓ **Responsive**: Proper mobile support without manual tweaking  
✓ **Stability**: No layout shifts thanks to skeleton matching  
✓ **Type-safe**: Full TypeScript support  
✓ **Prop reduction**: Fewer drilling props needed  
✓ **Loading states**: Consistent skeleton patterns across app

