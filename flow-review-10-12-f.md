## PRO Plan Flow

### Overview

- Applies when subscription.plan = PRO.
- Paths: `UserStateResolver` → PAID_ACTIVE/PAID_EXPIRING/BLOCKED, onboarding paid (PRO slides), setup, payment/pricing.

### Flow Breakdown

1. Authenticated PRO user.
2. `UserStateResolver`:
   - If blocked → payment pricing.
   - If expiring (autoRenew=false & expiring day) → state PAID_EXPIRING, route `/(onboarding)/expiring`.
   - Else PAID_ACTIVE; onboarding if `showOnboarding`, then setup/projects.
3. Onboarding paid selects PRO slideshow.
4. Setup: full access.
5. Payment/pricing: plan changes, billing cycle selection.

### Findings & Fixes

- **Critical – Onboarding completion crash**  
  Same shared bug: `useOnboarding` uses undefined `setUser`, crashing after PRO onboarding/expiring flow completes.

  ```107:133:src/hooks/use-onboarding.ts
  setUser(refreshedUser.value); // undefined
  ```

  **Fix:** Update to auth store setter and proper error mapping.

- **Major – Pricing cycle toggle broken (paid plans)**  
  Annual/monthly toggle mislabeled and single-option; users cannot choose annual pricing.

  ```151:178:src/app/(protected)/(payment)/pricing.tsx
  onPress={() => handleCycleChange(BillingCycle.MONTHLY)} // label Annually
  ```

  **Fix:** Add dual toggle with correct handlers and guards for null `selectedPlan`.

- **Major – Verification gating inconsistent**  
  Payment layout allows skip; pricing modal does not. Deep links to `/payment` let unverified users bypass pricing gate.
  ```24:42:src/app/(protected)/(payment)/_layout.tsx
  needsVerification && <EmailVerificationModal ... showSkipButton />
  ```
  **Fix:** Enforce a single policy for paid plans (require verify or enforce skip consequences) and block payment intent creation if unverified.

### Testing Checklist

- PRO user in expiring state → hits expiring onboarding, completes without crash and routes appropriately.
- Toggle monthly/annual works and sends selected cycle to payment.
- Unverified PRO user cannot pay or downgrade/upgrade without consistent verification handling.

### Mermaid (PRO)

```mermaid
flowchart TD
  A[Auth user plan=PRO] --> B{Blocked?}
  B -- Yes --> C[/payment/pricing]
  B -- No --> D{Expiring day?}
  D -- Yes --> E[/onboarding/expiring]
  D -- No --> F{showOnboarding?}
  F -- Yes --> G[Onboarding Paid (PRO slides)]
  F -- No --> H{needsSetup?}
  G --> H
  H -- Yes --> I[/setup]
  H -- No --> J[/app/projects]
  J --> K[Plan management via pricing/payment]
```
