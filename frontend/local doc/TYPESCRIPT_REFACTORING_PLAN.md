# TypeScript + Component Refactoring Strategy for SmartSchool Frontend

**Date:** November 27, 2025  
**Status:** Ready for Implementation  
**Priority Phases:** 4 sequential phases (estimate: 2-3 weeks for full migration)

---

## Executive Summary

This plan implements the **Incremental Strangler Pattern** to minimize risk while maximizing benefit. Key principles:

1. **Safety First** - E2E tests before any refactoring
2. **Coexistence** - TypeScript and JavaScript work side-by-side
3. **Component Extraction Before Typing** - Logic extraction → UI component splitting → TypeScript migration
4. **Least Effort** - Work only on files being touched; avoid cleaning dead code
5. **Incremental** - One feature/page at a time; never stop development

---

## Current State Analysis

### Codebase Overview
- **Framework:** Vite + React 18.2
- **Current Language:** Pure JavaScript (.jsx)
- **Dev Dependencies:** TypeScript 4.9.5 already installed ✅
- **Build Tool:** Vite with React plugin ✅
- **Path Aliases:** `@/` already configured ✅
- **DevServer:** Port 3000 ✅

### Monolithic Components (Ranked by Urgency)

| File | Size | Lines | Priority |
|------|------|-------|----------|
| `homeroom/StudentList.jsx` | 187.88 KB | 4738 | **HIGHEST** |
| `admin/Management.jsx` | 117.09 KB | ~3000 | **HIGH** |
| `admin/ClassManagement.jsx` | 97.41 KB | ~2500 | **HIGH** |
| `subject/GradeManagement.jsx` | 92.08 KB | ~2400 | **HIGH** |
| `homeroom/GradeManagement.jsx` | 92.08 KB | ~2400 | **HIGH** |
| `admin/ContinuousRecognition.jsx` | 77.91 KB | ~2000 | **MEDIUM** |
| `subject/Dashboard.jsx` | 40.5 KB | ~1000 | MEDIUM |
| `homeroom/AttendanceView.jsx` | 39.05 KB | ~1000 | MEDIUM |
| Others | <30 KB | <750 | LOW |

### Good News ✅
- Vite already configured with path aliases (`@/`)
- TypeScript dependencies already installed
- `jsconfig.json` already exists
- Modern React patterns (18.x)

### Risks to Mitigate ⚠️
- No E2E test coverage → breaking changes undetected
- No visual regression tests → CSS breaks go unnoticed
- Mixed JS/TS will require loose `tsconfig.json`
- Large monolithic files = high refactoring risk

---

## PHASE 1: The Safety Net (Weeks 1-2)

### Goal
Establish automated testing before changing a single line of code.

### 1.1 E2E Test Setup with Playwright

**Install Playwright:**
```bash
npm install -D @playwright/test
```

**Create `.gitignore` entries:**
```
test-results/
playwright-report/
.auth/
```

**Create `playwright.config.js`:**
```javascript
// frontend/playwright.config.js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
```

**Create test directory structure:**
```
frontend/
  e2e/
    fixtures/
      auth.fixture.js          # Authentication setup
    specs/
      01-auth.spec.js          # Login, DashboardSelector, ForgotPassword
      02-admin-dashboard.spec.js
      03-homeroom-dashboard.spec.js
      04-critical-flows.spec.js
    helpers/
      test-data.js
```

**Create `e2e/fixtures/auth.fixture.js`:**
```javascript
import { test as base } from '@playwright/test';

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Login logic here - extract from Login.jsx
    await page.goto('/');
    await page.fill('[name="username"]', process.env.TEST_USER || 'admin');
    await page.fill('[name="password"]', process.env.TEST_PASS || 'password');
    await page.click('button:has-text("Login")');
    await page.waitForURL('/dashboard');
    
    await use(page);
  },
});

export { expect } from '@playwright/test';
```

**Critical Path Tests to Write:**
1. **Auth Flow** (`01-auth.spec.js`) - Login → DashboardSelector → Navigate to role-specific dashboard
2. **Admin Dashboard** - Load data, interact with main tables
3. **Homeroom Dashboard** - Student list, grade management basic operations
4. **Data Operations** - Create, read, update, delete in key flows

**Add to `package.json` scripts:**
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:debug": "playwright test --debug"
}
```

### 1.2 Visual Regression Testing

**Install Percy CLI (Optional but recommended):**
```bash
npm install -D @percy/cli @percy/playwright
```

OR use Playwright's built-in snapshots (simpler for now):

**Create `e2e/specs/visual-snapshots.spec.js`:**
```javascript
import { test, expect } from '@playwright/test';

test.describe('Visual Regression - Key Pages', () => {
  test('Admin Dashboard snapshot', async ({ page }) => {
    // Assume authenticated
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-dashboard.png');
  });

  test('Homeroom Dashboard snapshot', async ({ page }) => {
    await page.goto('/homeroom/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('homeroom-dashboard.png');
  });

  test('StudentList page snapshot', async ({ page }) => {
    await page.goto('/homeroom/students');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('student-list.png');
  });
});
```

### 1.3 Validation Checklist ✓

- [ ] Playwright installed and config working
- [ ] 3-5 critical path E2E tests written and passing
- [ ] Visual snapshots generated
- [ ] CI/CD setup (optional but recommended)
- [ ] Test results reviewed and baseline established

**Effort:** ~4-6 hours  
**Risk:** Minimal - only adding tests, no code changes  

---

## PHASE 2: Infrastructure Setup (Week 2)

### Goal
Enable TypeScript and JavaScript coexistence with minimal type strictness.

### 2.1 Update `tsconfig.json`

**Replace `frontend/tsconfig.json`:**
```json
{
  "compilerOptions": {
    "ignoreDeprecations": "6.0",
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    // === KEY FOR COEXISTENCE ===
    "allowJs": true,                    // Allow .js and .ts files
    "checkJs": false,                   // DON'T type-check .js files yet
    "noImplicitAny": false,             // Allow 'any' type
    "strict": false,                    // Full strict mode OFF
    "noImplicitThis": false,            // Allow implicit 'this: any'
    "alwaysStrict": false,              // No 'use strict'

    // === NICE TO HAVE ===
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noUnusedLocals": false,            // Don't fail on unused vars yet
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,

    // === PATH ALIASES ===
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/pages/*": ["src/pages/*"],
      "@/services/*": ["src/services/*"],
      "@/contexts/*": ["src/contexts/*"],
      "@/utils/*": ["src/utils/*"],
      "@/hooks/*": ["src/hooks/*"],
      "@/types/*": ["src/types/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "build", "e2e", "test-results"]
}
```

### 2.2 Update `vite.config.js` (Minimal Changes)

**Add TypeScript support:**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'build',
  },
})
```

**No changes needed!** Vite handles `.ts` and `.js` automatically.

### 2.3 Create Global Type Definitions

**Create `frontend/src/types/index.ts`:**
```typescript
// Global type definitions that all .ts files will use

// Temporary workaround for "I'll type this later"
export type TODO = any;

// Common patterns from your API
export interface User {
  id: string;
  username: string;
  role: 'admin' | 'homeroom' | 'subject' | 'student' | 'parent';
  name: string;
  email: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Add more as needed during refactoring
```

### 2.4 Add VSCode Settings (Optional but Helpful)

**Create `frontend/.vscode/settings.json`:**
```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "typescript.defaultLibrary": "ES2020",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  }
}
```

### 2.5 Validation Checklist ✓

- [ ] `tsconfig.json` updated with permissive settings
- [ ] `vite.config.js` working without changes
- [ ] `npm run dev` starts without errors
- [ ] `npm run build` completes successfully
- [ ] E2E tests still pass
- [ ] Path aliases working (try `import { TODO } from '@/types'`)
- [ ] No TypeScript errors in IDE

**Effort:** ~1-2 hours  
**Risk:** Very low - additive only  

---

## PHASE 3: Component Extraction & Refactoring (Weeks 2-3)

### Overview
This is the core work. Follow this algorithm **strictly** for each page:

### 3.1 The Refactoring Algorithm

For each large component (start with smallest first to build confidence):

#### Step A: Extract Business Logic (Headless Refactor)

**Before:** All state, effects, and handlers mixed with JSX
```jsx
function StudentList() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});
  
  useEffect(() => {
    // 50 lines of fetch logic
  }, []);
  
  const handleAdd = () => { /* ... */ };
  const handleEdit = () => { /* ... */ };
  const handleDelete = () => { /* ... */ };
  
  return (
    <div>
      {/* 200+ lines of JSX */}
    </div>
  );
}
```

**After:** Logic in custom hook
```typescript
// src/hooks/useStudentList.ts
export function useStudentList() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});
  
  useEffect(() => {
    // 50 lines of fetch logic
  }, []);
  
  const handleAdd = (student: TODO) => { /* ... */ };
  const handleEdit = (id: string, updates: TODO) => { /* ... */ };
  const handleDelete = (id: string) => { /* ... */ };
  
  return {
    students,
    loading,
    filters,
    setFilters,
    handleAdd,
    handleEdit,
    handleDelete,
  };
}

// src/pages/homeroom/StudentList.jsx (still JSX for now)
function StudentList() {
  const logic = useStudentList();
  
  return (
    <div>
      {/* Same 200+ lines of JSX, but now accessing logic.students, logic.handleAdd, etc */}
    </div>
  );
}
```

**Advantage:** Logic is now isolated, typed, and testable. JSX remains untouched.

#### Step B: Extract "Dumb" UI Components

**Identify repeated patterns in the JSX:**
- Tables/rows that repeat
- Modal dialogs
- Form sections
- Cards
- Filter panels

**Create sub-components:**
```typescript
// src/components/StudentTable/StudentRow.tsx
interface StudentRowProps {
  student: Student;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
  onViewDetails: (student: Student) => void;
}

export function StudentRow({ student, onEdit, onDelete, onViewDetails }: StudentRowProps) {
  return (
    <tr>
      <td>{student.name}</td>
      <td>{student.email}</td>
      <td>
        <button onClick={() => onViewDetails(student)}>View</button>
        <button onClick={() => onEdit(student)}>Edit</button>
        <button onClick={() => onDelete(student.id)}>Delete</button>
      </td>
    </tr>
  );
}
```

Replace in main component:
```jsx
// In StudentList.jsx
return (
  <table>
    <tbody>
      {logic.students.map(student => (
        <StudentRow
          key={student.id}
          student={student}
          onEdit={logic.handleEdit}
          onDelete={logic.handleDelete}
          onViewDetails={handleViewDetails}
        />
      ))}
    </tbody>
  </table>
);
```

#### Step C: Rename `.jsx` to `.tsx` When Small Enough

Once a component is <100 lines of JSX and has extracted logic:
1. Rename `ComponentName.jsx` → `ComponentName.tsx`
2. Fix any TypeScript errors (add prop types)
3. Run E2E tests to verify behavior unchanged

### 3.2 Recommended Refactoring Order

**Priority 1 - Start here (smaller, high value):**
1. `subject/Dashboard.jsx` (40.5 KB) - Good training
2. `homeroom/Dashboard.jsx` (24.95 KB) - Good training
3. `auth/Login.jsx` (5.78 KB) - Small, critical path

**Priority 2 - Medium complexity:**
4. `admin/Dashboard.jsx` (18.79 KB)
5. `homeroom/AttendanceView.jsx` (39.05 KB)
6. `homeroom/FaceManagement.jsx` (29.56 KB)

**Priority 3 - Large, complex (do only after experience):**
7. `admin/ContinuousRecognition.jsx` (77.91 KB)
8. `homeroom/GradeManagement.jsx` (92.08 KB)
9. `subject/GradeManagement.jsx` (92.08 KB)
10. `admin/ClassManagement.jsx` (97.41 KB)
11. `admin/Management.jsx` (117.09 KB)
12. `homeroom/StudentList.jsx` (187.88 KB) - Save for last

### 3.3 Checklist for Each Component Refactoring

For `ComponentName.jsx`:

- [ ] **Extract Logic**
  - [ ] Create `src/hooks/use[ComponentName].ts`
  - [ ] Move all `useState`, `useEffect`, handlers to hook
  - [ ] Hook returns: data, methods, loading states
  - [ ] Hook file is TypeScript (`.ts`)

- [ ] **Test Logic Extraction**
  - [ ] Component still renders identically
  - [ ] All interactions work
  - [ ] E2E tests still pass

- [ ] **Extract Sub-Components**
  - [ ] Identify 3-5 repeatable UI chunks
  - [ ] Create `src/components/[Feature]/[ComponentName].tsx` for each
  - [ ] Add proper TypeScript interfaces for props
  - [ ] Replace JSX chunks with new components

- [ ] **Test Sub-Components**
  - [ ] Component still renders identically
  - [ ] All interactions work
  - [ ] E2E tests still pass

- [ ] **Rename and Final Polish**
  - [ ] Rename `ComponentName.jsx` → `ComponentName.tsx`
  - [ ] Fix any TypeScript errors
  - [ ] Add type annotations where obvious (props, state)
  - [ ] Use `TODO` type for anything unclear
  - [ ] Use `allowJs: true` to suppress .js import warnings

- [ ] **Verify**
  - [ ] Build succeeds: `npm run build`
  - [ ] Dev server runs: `npm run dev`
  - [ ] E2E tests pass: `npm run test:e2e`

**Effort per component:** 2-4 hours (depends on size)  
**Total Phase 3:** ~12-20 hours  

---

## PHASE 4: Progressive TypeScript Migration (Weeks 3+)

### Goal
Gradually increase TypeScript strictness as more code converts.

### 4.1 File-by-File Conversion Strategy

As you refactor components following Phase 3:

**For each newly extracted hook (`.ts` files):**
```typescript
// ✅ Already TypeScript, add proper types:
import { useState, useEffect } from 'react';
import { Student, TODO } from '@/types';

interface UseStudentListReturn {
  students: Student[];
  loading: boolean;
  filters: Record<string, any>;
  setFilters: (filters: any) => void;
  handleAdd: (student: TODO) => Promise<void>;
  handleEdit: (id: string, updates: TODO) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
}

export function useStudentList(): UseStudentListReturn {
  // Implementation...
}
```

**For each new sub-component (`.tsx` files):**
```typescript
// ✅ TypeScript with React.FC or direct types:
interface StudentRowProps {
  student: Student;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
}

export function StudentRow({ student, onEdit, onDelete }: StudentRowProps) {
  // Implementation...
}

// OR using React.FC (older style but still common):
export const StudentRow: React.FC<StudentRowProps> = ({ student, onEdit, onDelete }) => {
  // Implementation...
};
```

**For existing `.jsx` files being refactored (still `.jsx` for now):**
```jsx
// ✅ Eventually rename to .tsx:
import { useStudentList } from '@/hooks/useStudentList';

// Can stay as .jsx initially
function StudentList() {
  const logic = useStudentList();
  return <div>{/* ... */}</div>;
}
```

### 4.2 Incremental Strictness

**Current Phase 3-4 setting:** `"strict": false`

**As more files convert, gradually enable:**

```json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": false,           // ← Enable here after 30% converted
    "strictNullChecks": false,
    "strictFunctionTypes": false,
    "strictBindCallApply": false,
    "strictPropertyInitialization": false,
    "noImplicitThis": false
  }
}
```

Then later:
```json
{
  "compilerOptions": {
    "strict": true,                   // ← Enable here after 70% converted
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 4.3 Context Conversion (Important for Your Project)

**Current `AuthContext.jsx` → `AuthContext.tsx`:**

```typescript
// src/contexts/AuthContext.tsx
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      // API call
      setUser({ /* ... */ });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### 4.4 Convert Utilities & Services (Lower Risk)

**Start with `services/api.jsx` → `services/api.ts`:**

```typescript
// src/services/api.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse } from '@/types';

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30000,
});

// Interceptors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
    }
    return Promise.reject(error);
  }
);

export async function login(username: string, password: string): Promise<ApiResponse<any>> {
  const response = await api.post<ApiResponse<any>>('/auth/login', {
    username,
    password,
  });
  return response.data;
}

export default api;
```

### 4.5 Build Artifacts for Monitoring

**Create `frontend/TYPESCRIPT_MIGRATION_TRACKER.md`:**

```markdown
# TypeScript Migration Progress

Last Updated: [DATE]

## Statistics
- Total Files: [X]
- TypeScript Files (.ts/.tsx): [Y]
- Percentage Converted: [Y/X]%

## By Category

### Hooks (src/hooks/)
- [ ] useStudentList.ts ✓
- [ ] useClassManagement.ts
- [ ] useAttendance.ts

### Components (src/components/)
- [ ] StudentRow.tsx ✓
- [ ] ClassTable.tsx
- [ ] GradeForm.tsx

### Pages (src/pages/)
- [ ] auth/Login.tsx ✓
- [ ] admin/Dashboard.tsx
- [ ] homeroom/StudentList.tsx

### Contexts (src/contexts/)
- [ ] AuthContext.tsx ✓
- [ ] SystemSettingsContext.tsx

### Services (src/services/)
- [ ] api.ts ✓
- [ ] cache.ts

## Known Issues / TODOs
- [ ] Location A: Needs type definition
- [ ] Location B: API response format unclear

## Performance Impact
- Build size: [BEFORE] → [AFTER]
- Bundle time: [BEFORE] → [AFTER]
- Type-check time: [TIME]

## Completed Refactors
1. ✓ Login page (2024-11-27)
2. ✓ Admin Dashboard (2024-11-28)
```

---

## IMPLEMENTATION DECISION POINTS

### ⚠️ Decisions You Must Make

**1. Testing Framework Preference**
- [ ] Playwright (recommended, full-featured)
- [ ] Cypress (simpler syntax, good for beginners)
- [ ] None yet (risky, come back to this)

**2. When to Enable Strict Mode**
- [ ] Immediately (aggressive, will require lots of typing)
- [ ] After 50% conversion (balanced)
- [ ] After 90% conversion (safe, lazy)

**3. Component Library Approach**
- [ ] Keep all new components in `src/components/[Feature]/` folders
- [ ] Keep minimal - only extract when >200 lines duplicated
- [ ] Aggressively extract - even small reusable bits

**4. Naming Convention for Refactored Hooks**
- [ ] `use[PageName].ts` (e.g., `useStudentList.ts`)
- [ ] `use[Feature].ts` (e.g., `useStudentManagement.ts`)
- [ ] Prefix with scope `use[Role][Feature].ts` (e.g., `useHomeroomStudents.ts`)

**5. Type Strictness for Props**
- [ ] Full interface for everything
- [ ] Interface only for complex props, inline for simple
- [ ] Use `React.FC<Props>` vs direct function with types

---

## RISK MITIGATION CHECKLIST

- [ ] **Before Phase 1:** Team agrees on testing strategy
- [ ] **Before Phase 2:** `npm run dev` and `npm run build` still work
- [ ] **Before Phase 3:** All Phase 1 tests passing, baselines established
- [ ] **Phase 3 ongoing:** Every component change is checked with E2E tests
- [ ] **Phase 4 ongoing:** No decrease in test pass rate
- [ ] **Weekly:** Check bundle size remains stable or improves

---

## Success Metrics

### After Phase 1 (Safety Net Ready)
✅ 5+ critical path E2E tests passing  
✅ Visual regression baseline established  
✅ Team confident about catching breaking changes  

### After Phase 2 (Infrastructure Ready)
✅ `npm run dev` and `npm run build` with no errors  
✅ Can import both `.js` and `.ts` files without warnings  
✅ IDE recognizes TypeScript paths properly  

### After Phase 3 (Components Extracted - Target: 30-40% by this point)
✅ 3-5 major pages refactored into modular components  
✅ All E2E tests still passing  
✅ File sizes reduced by 20-30%  
✅ Developer velocity stable or improving  

### After Phase 4 (TypeScript Adoption - Target: 80-100%)
✅ >80% of codebase in TypeScript  
✅ `strict: true` enabled  
✅ Consistent type coverage  
✅ IDE type hints working throughout codebase  

---

## Estimated Timeline

| Phase | Duration | Effort | Risk |
|-------|----------|--------|------|
| 1: Safety Net | 3-5 days | 4-6 hours | Minimal |
| 2: Infrastructure | 1-2 days | 1-2 hours | Very Low |
| 3: Extraction (First 3 pages) | 3-5 days | 6-12 hours | Medium |
| 3: Extraction (All pages) | 2-3 weeks | 20-30 hours | Medium |
| 4: TypeScript Migration | 2-4 weeks | 15-25 hours | Low |
| **Total** | **4-6 weeks** | **40-75 hours** | **Medium** |

**Note:** Can run components in parallel if team has multiple developers.

---

## DO NOT DO List ❌

- ❌ Don't convert all files at once
- ❌ Don't enable `strict: true` until >70% done
- ❌ Don't skip Phase 1 (tests)
- ❌ Don't refactor files you're not actively working on
- ❌ Don't rename `.jsx` to `.tsx` before logic extraction
- ❌ Don't change business logic during refactoring
- ❌ Don't allow test pass rate to drop

---

## Quick Start Commands

```bash
# Phase 1 Setup
npm install -D @playwright/test

# Phase 2 Setup
npm run dev
npm run build

# Phase 3 & 4 Ongoing
npm run dev              # Watch for errors
npm run test:e2e        # Run tests before commits
npm run build           # Check bundle size

# Monitor TypeScript
npx tsc --noEmit        # Check for type errors (after Phase 2)
```

---

## Support Resources

- **Gemini's Plan Source:** `fe-migrate.txt` in this repo
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/
- **Vite Migration Guide:** https://vitejs.dev/guide/migration.html
- **Playwright Docs:** https://playwright.dev/docs/intro
- **React + TypeScript Patterns:** https://react-typescript-cheatsheet.netlify.app/

---

## Next Steps

1. **Review this document with your team** (30 min)
2. **Make decisions on 5 Decision Points above** (15 min)
3. **Start Phase 1: E2E Test Setup** (4-6 hours)
4. **Establish baseline and pass all Phase 1 tests** (2-3 hours)
5. **Move to Phase 2 once Phase 1 is 100% complete**

---

**Document Version:** 1.0  
**Last Updated:** November 27, 2025  
**Status:** Ready for Implementation  
**Approved By:** [Team Lead Name]
