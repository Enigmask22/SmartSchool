# SETUP CHECKLIST & TEAM DECISIONS

## Overview
This document tracks the 5 critical decisions your team needs to make BEFORE starting Phase 1.

**Status:** 🔴 NOT STARTED  
**Last Updated:** November 27, 2025  

---

## Decision 1: Testing Framework ⚠️ REQUIRES DECISION

**Question:** Which E2E testing framework do you prefer?

### Option A: Playwright (RECOMMENDED)
- ✅ Full-featured, handles complex scenarios
- ✅ Excellent debugging with Inspector
- ✅ Good documentation and community
- ✅ Can test visual regression easily
- ⏱️ Setup: Already started (see `playwright.config.js`)

### Option B: Cypress
- ✅ Simpler syntax, good for smaller projects
- ✅ Great UI for watching tests run
- ❌ Limited visual testing
- ⏱️ Setup: Need to install and configure

### Option C: Manual Testing / Defer
- ❌ Risky, can introduce breaking changes
- ⏱️ Setup: None needed, but HIGHLY NOT RECOMMENDED

**DECISION:** Choose ONE and circle below:
```
  [✅ A ] Playwright (recommended - already started)
  [ B ] Cypress (requires reinstall)
  [ C ] Manual / Defer (NOT RECOMMENDED)
```

**Decided By:** You & GitHub Copilot  
**Date:** November 27, 2025  
**Notes:** Infrastructure ready, Copilot will create test cases

---

## Decision 2: TypeScript Strictness Timeline ⚠️ REQUIRES DECISION

**Question:** When should we enable `strict: true` in `tsconfig.json`?

### Option A: Immediately (Aggressive)
- ✅ Full type safety from day 1
- ❌ Will slow down refactoring (lots of typing)
- ❌ Requires more upfront effort

### Option B: After 50% Conversion (Balanced)
- ✅ Gradual enforcement
- ✅ Team gets comfortable with types first
- ✅ Balanced effort and safety
- ✅ RECOMMENDED

### Option C: After 90% Conversion (Lazy)
- ✅ Minimal disruption during refactoring
- ❌ Many files will have technical debt
- ❌ Harder to enforce later

**DECISION:** Choose ONE and circle below:
```
  [ A ] Immediately (aggressive, ~2 weeks slower)
  [✅ B ] After 50% converted (recommended, balanced)
  [ C ] After 90% converted (risky, technical debt)
```

**Decided By:** You & GitHub Copilot  
**Date:** November 27, 2025  
**Notes:** Enable strict mode after 50% refactoring is done

---

## Decision 3: Component Extraction Scope ⚠️ REQUIRES DECISION

**Question:** How aggressively should we extract components?

### Option A: Minimal Extraction (Only >200 lines duplicated)
- ✅ Less refactoring, faster progress
- ❌ Less reusability, duplicate code
- ⏱️ Estimate: 30-40% of possible components

### Option B: Medium Extraction (Repeating patterns)
- ✅ Good balance of reusability and effort
- ✅ RECOMMENDED
- ⏱️ Estimate: 60-70% of possible components

### Option C: Aggressive Extraction (Even small reusable bits)
- ✅ Maximum reusability and modularity
- ❌ More refactoring work, longer timeline
- ⏱️ Estimate: 80-90% of possible components

**DECISION:** Choose ONE and circle below:
```
  [ A ] Minimal - Only significant duplication (faster)
  [✅ B ] Medium - Most repeating patterns (recommended, balanced)
  [ C ] Aggressive - Even small reusable bits (slower, cleaner)
```

**Decided By:** You & GitHub Copilot  
**Date:** November 27, 2025  
**Notes:** Extract repeating patterns for good balance

---

## Decision 4: Custom Hook Naming Convention ⚠️ REQUIRES DECISION

**Question:** How should we name custom hooks?

### Option A: `use[PageName]`
- Example: `useStudentList.ts`, `useClassManagement.ts`
- ✅ Clear what page it belongs to
- ✅ Easy to find hooks
- ✅ RECOMMENDED

### Option B: `use[Feature]`
- Example: `useStudentManagement.ts`, `useClassEditor.ts`
- ✅ Groups related logic
- ⚠️ Less clear page association

### Option C: `use[Role][Feature]`
- Example: `useHomeroomStudents.ts`, `useAdminClassManagement.ts`
- ✅ Very specific and clear
- ❌ Verbose and long names

**DECISION:** Choose ONE and circle below:
```
  [✅ A ] use[PageName] (e.g., useStudentList) - RECOMMENDED
  [ B ] use[Feature] (e.g., useStudentManagement)
  [ C ] use[Role][Feature] (e.g., useHomeroomStudents)
```

**Decided By:** You & GitHub Copilot  
**Date:** November 27, 2025  
**Notes:** Clear page-based naming

---

## Decision 5: Prop Type Definition Style ⚠️ REQUIRES DECISION

**Question:** How should we define component prop types?

### Option A: Full Interfaces (Verbose)
```typescript
interface ComponentProps {
  id: string;
  name: string;
  onDelete: (id: string) => void;
}

export function Component({ id, name, onDelete }: ComponentProps) { }
```
- ✅ Most explicit, best for documentation
- ✅ RECOMMENDED

### Option B: React.FC with Props
```typescript
interface Props { ... }
export const Component: React.FC<Props> = ({ ... }) => { }
```
- ✅ Traditional React style
- ⚠️ Slightly less modern

### Option C: Inline Types (Simpler)
```typescript
export function Component({ 
  id,
  name,
  onDelete
}: {
  id: string;
  name: string;
  onDelete: (id: string) => void;
}) { }
```
- ✅ Less boilerplate
- ❌ Harder to read with many props

**DECISION:** Choose ONE and circle below:
```
  [✅ A ] Full Interfaces - interface ComponentProps { } - RECOMMENDED
  [ B ] React.FC with Props
  [ C ] Inline Types
```

**Decided By:** You & GitHub Copilot  
**Date:** November 27, 2025  
**Notes:** Full interfaces for clarity and documentation

---

## Pre-Phase 1 Setup Checklist

- [ ] **Decision 1 made:** Testing framework chosen
- [ ] **Decision 2 made:** Strictness timeline decided
- [ ] **Decision 3 made:** Component extraction scope decided
- [ ] **Decision 4 made:** Hook naming convention decided
- [ ] **Decision 5 made:** Prop type definition style decided

---

## Phase 1 Preparation Checklist

### Environmental Setup
- [ ] All team members have Node.js 16+ installed
- [ ] Frontend dev server can run: `cd frontend && npm run dev`
- [ ] No build errors currently: `npm run build` succeeds
- [ ] No TypeScript errors: IDE shows no red squiggles (yet)

### Access & Credentials
- [ ] Team has test user credentials (username/password)
- [ ] Test user can access all major role dashboards:
  - [ ] Admin dashboard accessible
  - [ ] Homeroom dashboard accessible
  - [ ] Subject dashboard accessible (if applicable)

### Documentation Review
- [ ] All team members read: `TYPESCRIPT_REFACTORING_PLAN.md`
- [ ] All team members read: `frontend/PHASE_1_QUICK_START.md`
- [ ] All team members received: `COMPONENT_REFACTORING_CHECKLIST.md`
- [ ] Team understands: Don't skip Phase 1 (tests are critical)

### Git Preparation
- [ ] Main branch is clean (no uncommitted changes)
- [ ] Create feature branch for refactoring:
  ```bash
  git checkout -b fe/typescript-refactoring
  ```
- [ ] Commits will be pushed regularly
- [ ] Team understands: Commit after each component

---

## Phase 1 Kickoff Checklist

Once all decisions are made and prep complete:

- [ ] Install Playwright: `npm install -D @playwright/test`
- [ ] Verify Playwright installed: `npx playwright --version`
- [ ] Update selectors in `e2e/helpers/test-data.js` with actual HTML
- [ ] Run first test: `npm run test:e2e:ui`
- [ ] At least 2 tests passing
- [ ] Baseline screenshots captured
- [ ] Team ready to proceed to Phase 2

**Phase 1 Start Date:** _______________  
**Phase 1 Target End Date:** _______________  

---

## Team Coordination

### Who is doing what?

| Person | Role | Responsibility |
|--------|------|-----------------|
| _______ | Tech Lead | Ensure decisions are made, Phase 1 runs smoothly |
| _______ | Developer 1 | Refactor [Page Name] |
| _______ | Developer 2 | Refactor [Page Name] |
| _______ | QA / Reviewer | Review refactoring PRs, run E2E tests |

### Communication Plan

- **Daily Standup:** [TIME] - Blocker check, progress update
- **Weekly Check-in:** [TIME] - Phase progress, any issues
- **PR Review:** Required before merge to refactoring branch
- **Slack Channel:** [CHANNEL] for quick questions

---

## Success Criteria

By end of Phase 1:
- ✅ 5+ critical E2E tests passing
- ✅ Visual regression baselines established
- ✅ Team confident about detecting breaking changes
- ✅ Ready to proceed to Phase 2 TypeScript setup

By end of Phase 2:
- ✅ TypeScript working alongside JavaScript
- ✅ No build errors with mixed `.ts` and `.jsx` files
- ✅ All E2E tests still passing

By end of full migration (4-6 weeks):
- ✅ 80%+ of codebase in TypeScript
- ✅ Component sizes reduced by 20-30%
- ✅ No performance degradation
- ✅ Full type safety enabled

---

## READY TO START?

Print this page, fill in decisions with your team, and start Phase 1!

Questions? Reference:
- Main guide: `TYPESCRIPT_REFACTORING_PLAN.md` (detailed, 20 min read)
- Quick start: `frontend/PHASE_1_QUICK_START.md` (5 min read)
- Component template: `COMPONENT_REFACTORING_CHECKLIST.md` (use per component)

**Date Decisions Finalized:** _______________  
**Date Phase 1 Started:** _______________  
**Date Phase 1 Completed:** _______________  
**Date Full Migration Completed:** _______________  

---

**Good luck! 🚀**
