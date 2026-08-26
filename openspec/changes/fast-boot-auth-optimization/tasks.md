## 1. Server-Side Session Resolution & RSC Root

- [x] 1.1 Implement server-side session reader helper (`getServerSessionState`) in `lib/auth.ts` to load session, memberships, and active sections on the server and verify with unit tests
- [x] 1.2 Convert `app/page.tsx` into an async Server Component that checks cookies and passes `initialSession` to `<Portal />`, verifying that unauthenticated requests yield immediate SSR of `AccessScreen`

## 2. Portal Initialization & Code Splitting

- [x] 2.1 Refactor `app/Portal.tsx` to accept `initialSession` prop, avoiding the initial `LoadingScreen` skeleton when session state is already determined by SSR
- [x] 2.2 Apply code splitting and dynamic imports to ensure heavy dashboard views and client libraries do not bloat the initial login bundle

## 3. Unified Authentication Payload

- [x] 3.1 Update `app/api/auth/firebase/route.ts` to load and return `sectionIds`, `memberships`, `sections`, and `archivedNextCursor` alongside `user` and `photoUrl` in a single response
- [x] 3.2 Update `finishGoogleAccess` in `app/Portal.tsx` to hydrate the portal state directly from the login response without a second request to `/api/auth/me`

## 4. Preconnects & Critical Asset Prioritization

- [x] 4.1 Add `preconnect` and `dns-prefetch` links in `app/layout.tsx` for `https://accounts.google.com`, `https://identitytoolkit.googleapis.com`, and `https://firestore.googleapis.com`
- [x] 4.2 Ensure brand assets (`/brand/ubb-shield.webp` y `/brand/google-g.webp`) have appropriate loading priorities

## 5. Verification & Quality Gates

- [x] 5.1 Run `pnpm run verify:fast` and verify that TypeScript typecheck and test-locking hashes pass with exit code 0
- [x] 5.2 Run `pnpm run verify:invariants` and verify that security invariants across all mirrors pass
- [x] 5.3 Run `pnpm run build` and verify that production build compiles without errors or warnings
