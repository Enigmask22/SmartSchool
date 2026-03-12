# Add These Scripts to package.json

In your `frontend/package.json`, add these test scripts to the `"scripts"` section.

**Location:** After the existing `"preview"` script

**Current state:**
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

**After adding test scripts:**
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

---

## What Each Script Does

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run dev` | `vite` | Start dev server (existing) |
| `npm run build` | `vite build` | Build for production (existing) |
| `npm run preview` | `vite preview` | Preview production build (existing) |
| `npm run test:e2e` | `playwright test` | Run E2E tests headless (new) |
| `npm run test:e2e:ui` | `playwright test --ui` | Run tests with UI inspector (new) |
| `npm run test:e2e:debug` | `playwright test --debug` | Debug mode with step-through (new) |

---

## Installation Instructions

### Step 1: Copy the 3 new scripts above

### Step 2: In `frontend/package.json`, find the `"scripts"` section

Should look like this around line 66-70:
```json
{
  "name": "smart-school-frontend",
  ...
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  ...
}
```

### Step 3: Add the new scripts

Change to:
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

### Step 4: Save and verify

```powershell
# Verify syntax is correct
cat frontend/package.json | Select-String -A 10 '"scripts"'
```

### Step 5: Install Playwright

```powershell
cd frontend
npm install -D @playwright/test
```

Should see output like:
```
added 30 packages, and audited 95 packages in 2s
```

### Step 6: Try running a test

```powershell
npm run test:e2e
```

If you see errors about selectors, that's expected. See `PHASE_1_QUICK_START.md` for fixing selectors.

---

## That's It!

You now have E2E testing infrastructure ready. The Playwright tests are in `e2e/specs/` and ready to run.

Next: Follow `frontend/PHASE_1_QUICK_START.md` to customize selectors and get tests passing.
