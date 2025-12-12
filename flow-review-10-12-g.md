## STUDIO Plan Flow

### Overview

- Applies when subscription.plan = STUDIO.
- Paths mirror PRO flow: PAID_ACTIVE/PAID_EXPIRING/BLOCKED, onboarding paid (PRO/STUDIO slides), setup, payment/pricing.

### Flow Breakdown

1. Authenticated STUDIO user.
2. `UserStateResolver` → PAID_ACTIVE unless blocked/expiring; onboarding shown if `showOnboarding`.
3. Onboarding paid uses PRO/STUDIO slideshow via `OnboardingPaidScreen`.
4. Setup: full access; feature limits via `useFeatureAccess`.
5. Payment/pricing for upgrades/downgrades; uses same UI as other paid plans.

### Findings & Fixes

- **Critical – Onboarding completion crash**  
  `useOnboarding` undefined setter affects STUDIO onboarding completion.

  ```107:133:src/hooks/use-onboarding.ts
  setUser(refreshedUser.value); // undefined
  ```

  **Fix:** Use auth store setter or dedicated updater with ErrorMapper.

- **Major – Pricing cycle toggle broken (paid plans)**  
  Annual/monthly selection unavailable/mislabeled; impacts STUDIO pricing accuracy.

  ```151:178:src/app/(protected)/(payment)/pricing.tsx
  onPress={() => handleCycleChange(BillingCycle.MONTHLY)} // label Annually
  ```

  **Fix:** Implement two-option toggle and guard null plan.

- **Major – Verification gate inconsistency**  
  Payment layout allows skip; pricing gate blocks without skip. Deep links to `/payment` let unverified STUDIO users proceed.
  ```24:42:src/app/(protected)/(payment)/_layout.tsx
  needsVerification && <EmailVerificationModal ... showSkipButton />
  ```
  **Fix:** Apply consistent policy (require verification or block payment processing when unverified).

### Testing Checklist

- STUDIO onboarding completion → no crash; routes to setup/projects.
- Annual/monthly toggle works and prices match plan configuration.
- Unverified STUDIO user cannot bypass verification unintentionally via deep link to payment.

### Mermaid (STUDIO)

```mermaid
flowchart TD
  A[Auth user plan=STUDIO] --> B{Blocked or Expiring?}
  B -- Yes --> C[/payment/pricing or /onboarding/expiring]
  B -- No --> D{showOnboarding?}
  D -- Yes --> E[Onboarding Paid (PRO/STUDIO slides)]
  D -- No --> F{needsSetup?}
  E --> F
  F -- Yes --> G[/setup]
  F -- No --> H[/app/projects]
  H --> I[Plan management via pricing/payment]
```
