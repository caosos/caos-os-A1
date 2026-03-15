# TSB-043: App.jsx Route Rebuilding (pages.config Removal)
**Date**: 2026-03-15
**Status**: ACTIVE
**Campaign**: Build Stability & Import Error Fix (3/15 night)

## Problem Statement
`App.jsx` was importing from `./pages.config.js` which did not exist:
```javascript
import pagesConfig from './pages.config.js';
```

This caused:
- Build error: "Cannot find module"
- App non-functional
- All routes broken

## Root Cause
`pages.config.js` was auto-generated in old app versions but is no longer created by Base44 build system. Routing must be done manually in `App.jsx`.

## Solution
**Removed pages.config import + manually defined all routes in App.jsx**

### Changes to App.jsx

1. **Removed Line 5** (old import):
   ```javascript
   // DELETED: import pagesConfig from './pages.config.js';
   ```

2. **Lines 12–19**: Hardcoded route definitions + wrappers:
   ```javascript
   const mainPage = 'Chat';
   const LayoutWrapper = ({ children }) => <>{children}</>;
   const routes = [
     { path: '/Chat', component: Chat },
     { path: '/Welcome', component: Welcome },
     { path: '/Admin', component: Admin },
   ];
   ```

3. **Lines 38–49**: Manual route mapping (replaced pagesConfig loop):
   ```javascript
   <Routes>
     <Route path="/" element={<Navigate to={`/${mainPage}`} replace />} />
     {routes.map((route) => (
       <Route key={route.path} path={route.path} element={<LayoutWrapper><route.component /></LayoutWrapper>} />
     ))}
     <Route path="*" element={<PageNotFound />} />
   </Routes>
   ```

### Build Impact
✅ App builds and runs without import errors
✅ All routes functional
✅ No need for pages.config.js
✅ Routes are explicit and maintainable

## Files Changed
- `App.jsx` (removed invalid import, added manual routes)

## New Routes Added
- `/` → redirect to `/Chat` (mainPage)
- `/Chat` → Chat page
- `/Welcome` → Welcome page
- `/Admin` → Admin page
- `*` → PageNotFound

## Rollback
Restore original App.jsx before 2026-03-15 21:00 UTC (has pages.config reference).

## Notes
- `pages.config.js` is NOT auto-generated anymore (Base44 API change)
- All new pages must be added as explicit `<Route>` elements in App.jsx
- LayoutWrapper can be customized per-route if needed
- PageNotFound is a fallback for unmapped paths