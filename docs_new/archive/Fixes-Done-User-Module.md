# **Guide: User Module Bug Fixes & Testing**

This document outlines the recent improvements to the User module. The primary goals were to:

1. **Fix a critical bug** that caused sign-ups to fail.
2. **Build a comprehensive test suite** to ensure the module is stable and maintainable.
3. **Add placeholder components** to support and test new user features.

## **1\. The Critical Bug Fix: Unsupported field value: undefined**

We started by diagnosing this error log:

Firestore Error: Function setDoc() called with invalid data. Unsupported field value: undefined (found in field phone in document users/...)

### **The Problem**

This error occurred during sign-up (useSignUp). The process was:

1. Firebase Auth account was created successfully.
2. The app tried to create a corresponding user document in the users collection.
3. This setDoc() call failed because the phone field in the user object had a value of undefined.
4. Firestore **does not accept undefined values**.
5. This failure triggered your AuthRepository warning to clean up the "orphaned" auth account.

The root cause was likely a form where an optional phone field was submitted without a value, which JavaScript treats as undefined.

### **The Solution: Sanitizing Data**

We implemented a robust fix at the **schema level** to ensure this can't happen again.

**File:** src/domain/user/user.schema.ts

**Change:** In the BaseUserSchema, the phone field was updated.

// Before (example)  
phone: z.string().optional(),

// After (The Fix)  
phone: z.string().optional().nullable().default(null),

**Why this works:**

- .optional(): Allows the field to be undefined during Zod's parsing.
- .nullable(): Allows the field to be null in the final object.
- .default(null): This is the key. If Zod sees undefined (or the field is missing), it will automatically replace it with null.

null is a valid value that Firestore accepts, completely solving the bug.

### **How We Tested the Fix**

We added specific tests to prove the fix works:

1. **\_\_tests\_\_/domain/user/user.schema.spec.ts**:
   - A test titled: "should default optional field "phone" to null if undefined or missing".
   - It creates a user object _without_ the phone field, parses it with BaseUserSchema, and asserts that result.phone is null.
2. **\_\_tests\_\_/repositories/firestore/firestore-base-user-repository.spec.ts**:
   - A test titled: "should sanitize undefined phone to null before calling setDoc".
   - This test simulates the repository receiving a "bad" user object with phone: undefined.
   - It asserts that the data passed to the (mocked) Firestore setDoc function has phone: null.

## **2\. New Test Strategy for the User Module**

The User module was missing tests for its core functionality. We've added a suite of tests that cover every layer of the architecture, from data validation up to the UI components.

This "inside-out" testing strategy ensures each part works in isolation before we test how they work together.

Here is a breakdown of the new test files and what they do:

### **a. Schema Tests**

- **Files:**
  - \_\_tests\_\_/domain/user/user.schema.spec.ts
  - \_\_tests\_\_/domain/user/business-card.schema.spec.ts
- **Purpose:** To validate your Zod schemas.
- **What they test:**
  - Do valid objects pass validation?
  - Do objects with missing required fields fail?
  - Are optional fields correctly defaulted to null or \[\]? (This is where the bug fix is tested).

### **b. State Store Test**

- **File:** \_\_tests\_\_/stores/use-base-user-store.spec.ts
- **Purpose:** To test the logic of your Zustand state store.
- **What it tests:**
  - Does the store initialize with the correct initialState?
  - Do actions like setUser, setError, and setLoading update the state as expected?
  - Does the reset action return the store to its initial state?

### **c. Repository Tests**

- **File:** \_\_tests\_\_/repositories/firestore/firestore-base-user-repository.spec.ts
- **Purpose:** To test the database layer _without_ making real database calls.
- **What they test:**
  - We **mock** the firebase/firestore SDK (functions like getDoc, setDoc).
  - Does the get method correctly return a user if the mock getDoc "finds" one?
  - Does it return a DB_002 (Not Found) error if the mock getDoc "doesn't find" one?
  - Does the create method call setDoc with the _correct, sanitized_ data?

### **d. Service Tests**

- **Files:**
  - \_\_tests\_\_/services/base-user-service.spec.ts
  - \_\_tests\_\_/services/user-profile-service.spec.ts
  - \_\_tests\_\_/services/business-card-service.spec.ts
- **Purpose:** To test your business logic layer.
- **What they test:**
  - We **mock** the _Repositories_ (e.g., IBaseUserRepository).
  - Does getUser call the repository's get method?
  - If the repository returns ok(user), does the service update the Zustand store with that user?
  - If the repository returns err(error), does the service update the store with that error?

### **e. Hook Tests**

- **Files:**
  - \_\_tests\_\_/hooks/use-base-user.spec.ts
  - \_\_tests\_\_/hooks/use-user-profile.spec.ts
  - \_\_tests\_\_/hooks/use-business-card.spec.ts
- **Purpose:** To test the React hooks that connect your UI to the services.
- **What they test:**
  - We **mock** the _Services_ (e.g., BaseUserService).
  - We use @testing-library/react-native's renderHook function.
  - Does the hook start in a loading state?
  - Does it call the service's get... method on mount?
  - When the service (mock) resolves, does the hook update to a loaded state with the correct data?
  - If the service (mock) fails, does the hook update to an error state?

### **f. Component Tests**

- **Files:**
  - \_\_tests\_\_/components/user/UserProfileForm.spec.tsx
  - \_\_tests\_\_/components/user/BusinessCardForm.spec.tsx
- **Purpose:** To test the UI components.
- **What they test:**
  - We use @testing-library/react-native's render function.
  - Does the form render with the correct initial values from its profile prop?
  - When a user types in a TextInput (simulated with fireEvent.changeText), does the input's value update?
  - When the "Save" button is pressed (fireEvent.press), is the onSave prop called with the _new, updated_ data?

## **3\. New Placeholder Components & Screens**

To support the new tests (especially for hooks and components), we first had to create the files. These are placeholders that provide a functional foundation for you to style and build upon.

- **Screens (in src/app/(user)/)**
  - profile.tsx: A screen to edit user profile (bio, website).
  - business-card.tsx: A screen to edit the user's public business card.
  - preferences.tsx: A screen to manage theme and notification settings.
- **Components (in src/components/user/)**
  - UserProfileForm.tsx: The form component used on the profile.tsx screen.
  - BusinessCardForm.tsx: The form component used on the business-card.tsx screen.

By fixing the sign-up bug and building this test suite, the User module is now significantly more stable, reliable, and easier to modify without risking future regressions.
