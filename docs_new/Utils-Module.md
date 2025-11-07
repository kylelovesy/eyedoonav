Here is the review of your `utils` module, complete with code refactors, critical sanitization/validation additions, a full test suite, and a guide on how to implement these changes.

### 1\. Code Review & Refactoring

I've reviewed your `utils` files and am suggesting several key improvements to fix potential bugs and improve consistency.

#### `id-generator.ts` (Refactor)

You are using the `uuid` library, which is fine, but React Native now has a built-in, native `crypto.randomUUID()` that is faster and removes a dependency.

http://googleusercontent.com/immersive_entry_chip/0

#### `sanitization-helpers.ts` (Critical Addition)

As flagged in the `Project` module review, we need a helper to prevent `undefined` values from being sent to Firestore. I've added `removeUndefinedValues` to this file.

http://googleusercontent.com/immersive_entry_chip/1

#### `schema-helpers.ts` (Critical New File)

This is a **new utility file** to hold the Zod preprocessor for handling Firestore Timestamps. This is the fix for the critical bug in your `ProjectSchema` and should be used in _all_ Zod schemas that parse dates from Firestore.

http://googleusercontent.com/immersive_entry_chip/2

#### `validation-helpers.ts` (Addition)

This file was likely empty. I've added a common email validation regex as a template for your reusable validation logic.

http://googleusercontent.com/immersive_entry_chip/3

#### `date-time-utils.ts` (Addition)

You have `date-fns` installed, so let's add a robust, reusable date formatter.

http://googleusercontent.com/immersive_entry_chip/4

### 2\. Test Suite for `utils` Module

Here are the corresponding test files. I've refactored the existing spec files to be robust and added tests for our new functions.

http://googleusercontent.com/immersive_entry_chip/5

http://googleusercontent.com/immersive_entry_chip/6

http://googleusercontent.com/immersive_entry_chip/7

http://googleusercontent.com/immersive_entry_chip/8

http://googleusercontent.com/immersive_entry_chip/9

http://googleusercontent.com/immersive_entry_chip/10

### 3\. Summary Guide: `utils` Module

Here’s a guide to the changes and how to implement them.

#### 1\. Summary of Changes

Your `utils` module is the foundation of your app's stability. The changes I've made are focused on two critical areas:

1.  **Fixing Data Corruption:** We've added helpers to fix critical bugs related to how data is sent to and received from Firestore.
    - **Sending Data:** Firestore `updateDoc` calls fail if an object has `undefined` values. Our new `removeUndefinedValues` function in `sanitization-helpers.ts` strips these values before the object is sent to the database.
    - **Receiving Data:** Firestore stores dates as `Timestamp` objects, not `Date` objects. Your Zod schemas would fail to parse this data. The new `dateSchema` in `schema-helpers.ts` is a preprocessor that safely converts `Timestamp` objects (and date strings) into `Date` objects _before_ validation.

2.  **Improving Consistency & Native Code:**
    - We refactored `id-generator.ts` to use the built-in `crypto.randomUUID()` instead of the `uuid` library, reducing dependencies.
    - We added standard helpers for `formatDate` and `isValidEmail` to ensure these operations are consistent everywhere.
    - We provided a robust test for `error-classifier.ts` as a template for testing your other complex error-handling utils.

#### 2\. How to Implement the Fixes

1.  **Copy/Update Files:**
    - Add the new file `src/utils/schema-helpers.ts`.
    - Update `src/utils/id-generator.ts`, `src/utils/sanitization-helpers.ts`, `src/utils/validation-helpers.ts`, and `src/utils/date-time-utils.ts` with the new content.

2.  **Run Tests:**
    - Copy all the new/updated `__tests__/utils/` files.
    - Run this specific test suite from your terminal:
      `npm test -- --testPathPattern=__tests__/utils`
    - This will run all 13 tests in the 6 files and confirm the new helpers work as expected.

3.  **Apply Fixes Throughout Your App (Crucial Next Steps):**
    - **Fix 1: Apply `dateSchema` (Timestamp Bug):**
      - Go to **every Zod schema** that has a `Date` field (like `project.schema.ts`, `timeline.schema.ts`, etc.).
      - Import `dateSchema` from `../utils/schema-helpers`.
      - Change `z.date()` to `dateSchema`.

      <!-- end list -->

      ```typescript
      // In src/domain/project/project.schema.ts
      import { dateSchema } from '../../utils/schema-helpers'; // <-- IMPORT

      export const ProjectSchema = z.object({
        // ...
        date: dateSchema, // <-- USE
        createdAt: dateSchema, // <-- USE
        updatedAt: dateSchema, // <-- USE
      });
      ```

    - **Fix 2: Apply `removeUndefinedValues` (Undefined Bug):**
      - Go to **every repository file** that has an `update` method (e.g., `firestore-base-user-repository.ts`).
      - Import `removeUndefinedValues` from `../utils/sanitization-helpers`.
      - Wrap the `data` object in this function before passing it to `updateDoc`.

      <!-- end list -->

      ```typescript
      // In src/repositories/firestore/firestore-base-user-repository.ts
      import { removeUndefinedValues } from '../../utils/sanitization-helpers'; // <-- IMPORT

      public async update(userId: string, data: Partial<BaseUser>): Promise<Result<void, AppError>> {
        try {
          const userDocRef = doc(this.db, this.paths.user(userId));
          const sanitizedData = removeUndefinedValues(data); // <-- USE
          await updateDoc(userDocRef, sanitizedData);
          return ok(undefined);
        } // ...
      }
      ```
