## FREE Plan Flow

### Overview

- Applies when subscription.plan = FREE.
- Key paths: `UserStateResolver` (UNVERIFIED_FREE / VERIFIED_FREE), onboarding free screen, limited setup, feature access.

### Flow Breakdown

1. Authenticated user with plan FREE.
2. `UserStateResolver`:
   - If `!isEmailVerified` → state `UNVERIFIED_FREE`, route `/(protected)/(onboarding)/free`, permission READ_ONLY.
   - If verified → state `VERIFIED_FREE`, still routed to onboarding free with limited setup access.
3. Onboarding (`src/app/(protected)/(onboarding)/free.tsx`):
   - Splash then slideshow, uses `useOnboarding` to mark onboarding complete, then redirects to projects.
4. Setup: limited (kit + group shots) allowed after onboarding; payment routes open for upgrade.

### Findings & Fixes

- **Critical – Onboarding completion crash**  
  Shared issue: `useOnboarding` calls undefined `setUser`, crashing after free onboarding completes. Blocks free users from exiting onboarding.

  ```107:133:src/hooks/use-onboarding.ts
  setUser(refreshedUser.value); // undefined
  ```

  **Fix:** Update to use auth store setter (`setAuthState(success(user))`) or exported setter with proper ErrorMapper.

- **Minor – No explicit email verification prompt for FREE**  
  UNVERIFIED_FREE routes to onboarding but does not surface verification UI; users may never verify and remain READ_ONLY.  
  **Fix:** Inject `EmailVerificationModal`/CTA inside free onboarding when `!user.isEmailVerified`, or auto-route to verification screen.

### Testing Checklist

- Unverified free user hits onboarding free, completes flow → no crash; remains limited until verification.
- Verified free user completes onboarding → directed to projects; setup limited screens load.
- Add regression: free user upgrades path still works from onboarding.

### Mermaid (FREE)

```mermaid
flowchart TD
  A[Auth user plan=FREE] --> B{Email verified?}
  B -- No --> C[State UNVERIFIED_FREE\nRoute: /onboarding/free\nPerm: READ_ONLY]
  B -- Yes --> D[State VERIFIED_FREE\nRoute: /onboarding/free\nSetupAccess: LIMITED]
  C --> E[Onboarding Free -> useOnboarding -> complete]
  D --> E
  E --> F[Projects (limited setup)]
  F --> G[Optional upgrade -> payment/pricing]
```
