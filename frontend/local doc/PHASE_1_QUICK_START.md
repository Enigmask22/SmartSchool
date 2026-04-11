# QUICK START - Phase 1 Setup (30 minutes)

This guide gets your team's E2E testing infrastructure running immediately.

## Prerequisites
- Node.js 16+ installed
- `npm run dev` successfully starts the dev server
- Access to test credentials (username/password)

## Step 1: Install Playwright (2 minutes)

```powershell
cd frontend
npm install -D @playwright/test
```

Expected output should include Playwright browser downloads.

## Step 2: Verify Configuration (1 minute)

Check that `playwright.config.js` exists in `frontend/` directory.

```powershell
ls frontend/playwright.config.js
```

## Step 3: Run Your First Test (5 minutes)

### Option A: Simple Run
```powershell
npm run test:e2e
```

### Option B: UI Mode (Best for Debugging)
```powershell
npm run test:e2e:ui
```

This opens the Playwright Inspector where you can see tests run in real-time.

### Option C: Debug Mode (For Troubleshooting)
```powershell
npm run test:e2e:debug
```

## Step 4: Fix Selectors (15 minutes)

**⚠️ CRITICAL:** Tests will fail because selectors don't match your actual HTML.

### Find Your Actual Selectors

1. Open your app: `npm run dev`
2. Go to login page: `http://localhost:3000`
3. Right-click on username input → Inspect
4. Find the actual attribute:
   ```html
   <!-- Your actual HTML might look like: -->
   <input class="form-control" placeholder="Username" type="text" />
   <input name="email" type="email" />
   <input className="login-input" />
   ```

### Update `e2e/helpers/test-data.js`

Replace the `SELECTORS` object with your actual selectors:

```javascript
export const SELECTORS = {
  USERNAME_INPUT: 'input[name="email"]',  // ← YOUR ACTUAL SELECTOR
  PASSWORD_INPUT: 'input[name="password"]',
  LOGIN_BUTTON: 'button[type="submit"]',
  // etc...
};
```

### Run Tests Again
```powershell
npm run test:e2e:ui
```

Tests should now find the elements and proceed.

## Step 5: Set Test Credentials (if different from default)

If your test user is NOT `admin`/`password`:

```powershell
# Option A: One-time run
$env:TEST_USERNAME="youruser"; $env:TEST_PASSWORD="yourpass"; npm run test:e2e

# Option B: Permanent - Create .env file in frontend/:
# TEST_USERNAME=youruser
# TEST_PASSWORD=yourpass
# Then: npm install -D dotenv
# Then update test files to load .env
```

## Step 6: Capture Baseline Screenshots (5 minutes)

Run tests to completion:
```powershell
npm run test:e2e
```

This generates:
- `test-results/login-page.png`
- `test-results/admin-dashboard.png`
- `test-results/homeroom-dashboard.png`

These are your visual regression baselines. Keep them safe!

```powershell
# Move to a safe location
mkdir frontend/test-baselines
cp test-results/*.png frontend/test-baselines/
```

## Troubleshooting

### "Browser not found"
```powershell
npx playwright install chromium firefox
```

### "Connection refused: localhost:3000"
Make sure `npm run dev` is running in another terminal.

### "Timeout waiting for login"
- Check if selectors in `test-data.js` match your actual HTML
- Check if your test user credentials are correct
- Check browser console for JavaScript errors

### "Tests run but always fail to find selectors"

Debug mode helps here:

```powershell
npm run test:e2e:debug
```

In the Inspector:
1. Click "Explore" (the magnifying glass)
2. Hover over elements in the browser
3. The Inspector shows the selector that matches
4. Copy that selector to `test-data.js`

## Success Checklist

- [ ] `npm install -D @playwright/test` completed
- [ ] Selectors updated in `e2e/helpers/test-data.js`
- [ ] `npm run test:e2e` runs without timing out
- [ ] At least 2 tests pass (01-auth or 02-dashboard)
- [ ] Screenshots generated in `test-results/`
- [ ] Team has baseline screenshots

## Next Steps

Once Phase 1 is passing:

1. **Commit baseline:** `git add e2e/` then commit
2. **Document your selectors:** Add comments in `test-data.js` with actual HTML structure
3. **Move to Phase 2:** Update `tsconfig.json` per main plan
4. **Run tests before every refactoring:** `npm run test:e2e`

---

**Need Help?**
- Check main guide: `TYPESCRIPT_REFACTORING_PLAN.md`
- Playwright docs: https://playwright.dev/docs/intro
- Ask team: "What selectors does your Login.jsx actually use?"
