## BASIC Plan Flow

### Overview

- Applies when subscription.plan = BASIC.
- Paths: `UserStateResolver` → PAID_ACTIVE (or BLOCKED), onboarding paid slideshow (BASIC), setup screens, payment/pricing.

### Flow Breakdown

1. Authenticated BASIC user.
2. `UserStateResolver`:
   - If subscription status blocked/trial expired → state BLOCKED, route `/(payment)/pricing`.
   - Else PAID_ACTIVE; if `showOnboarding` true → route `/(onboarding)/paid`; else setup or projects.
3. Onboarding paid chooses BASIC slide deck, uses `useOnboarding` to mark complete, then redirects to projects.
4. Setup: full access; uses feature limits via `useFeatureAccess`.
5. Payment: pricing screen allows plan changes; payment layout shows EmailVerificationModal if unverified.

### Findings & Fixes

- **Critical – Onboarding completion crash**  
  `useOnboarding` undefined setter crash affects BASIC onboarding completion.

  ```107:133:src/hooks/use-onboarding.ts
  setUser(refreshedUser.value); // undefined
  ```

  **Fix:** Use auth store setter (`setAuthState(success(user))`) or similar.

- **Major – Pricing cycle toggle broken (impacts all paid plans)**  
  Pricing screen toggle renders “Annually” but sets `BillingCycle.MONTHLY` and has no annual option; savings text uses `selectedPlan` even when null. Users cannot pick annual billing or see correct pricing.

  ```151:178:src/app/(protected)/(payment)/pricing.tsx
  <TouchableOpacity ... onPress={() => handleCycleChange(BillingCycle.MONTHLY)}>
    ... label Annually ...
  </TouchableOpacity>
  ```

  **Fix:** Provide two-toggle control (Monthly/Annual), correct labels, and guard `getAnnualSavings` when no plan is selected.

- **Major – Email verification gating inconsistent**  
  Pricing gate: unverified → modal with no skip. Payment layout gate: unverified → modal with skip that just navigates back, allowing bypass if deep-linked.
  ```24:42:src/app/(protected)/(payment)/_layout.tsx
  needsVerification && <EmailVerificationModal visible onSkip={handleClose} showSkipButton />
  ```
  **Fix:** Align gating: either enforce verification before payment for paid plans, or allow consistent skip with follow-up reminders; ensure payment route blocks processing when unverified.

### Testing Checklist

- BASIC user completes onboarding → no crash, routed to setup/projects.
- Pricing monthly/annual selection shows correct price and proceeds with chosen interval.
- Unverified BASIC user: verify consistent behavior between pricing and payment; no bypass of verification unless explicitly allowed.

### Mermaid (BASIC)

```mermaid
flowchart TD
  A[Auth user plan=BASIC] --> B{Blocked?}
  B -- Yes --> C[State BLOCKED -> /payment/pricing]
  B -- No --> D{showOnboarding?}
  D -- Yes --> E[Onboarding Paid (BASIC slides)]
  D -- No --> F{needsSetup?}
  E --> G[useOnboarding complete]
  G --> F
  F -- Yes --> H[/(setup)]
  F -- No --> I[/(app)/(projects)]
  I --> J[Optional plan change via pricing/payment]
```
