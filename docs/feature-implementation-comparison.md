# Feature Implementation Comparison

## Overview

This document compares the feature table to the actual codebase implementation status as of the current analysis.

---

## Feature-by-Feature Analysis

### ✅ Core Patterns (All Modules)

| Feature              | Status        | Notes                                              |
| -------------------- | ------------- | -------------------------------------------------- |
| **Ports & Adapters** | ✅ Consistent | All modules follow repository interface pattern    |
| **Result Pattern**   | ✅ Consistent | All async operations return `Result<T, AppError>`  |
| **Zod Validation**   | ✅ Consistent | All modules use Zod schemas for validation         |
| **Error Mapping**    | ✅ Consistent | All modules use `ErrorMapper` for error conversion |

---

### ⚠️ Optimistic Updates

| Module  | Table Status | Actual Status | Notes                                                                 |
| ------- | ------------ | ------------- | --------------------------------------------------------------------- |
| Lists   | ✅           | ✅            | Implemented in `use-list-actions.ts` (updateItems, deleteItems)       |
| Auth    | ❌           | ✅            | Correct - auth operations should NOT be optimistic                    |
| User    | ✅           | ✅            | Implemented in `use-user-profile.ts` using `useOptimisticUpdate` hook |
| Project | ❌           | ❌            | **MISSING** - No project hooks exist yet                              |
| Notes   | N/A          | ❓            | Notes only has schemas, no full implementation                        |

**Action Required:**

- Create `use-project.ts` hook with optimistic updates for project operations
- Notes module appears incomplete (schemas only, no service/repository/hooks)

---

### ⚠️ Explicit Sanitization

| Module  | Table Status | Actual Status | Notes                                                                        |
| ------- | ------------ | ------------- | ---------------------------------------------------------------------------- |
| Lists   | ✅           | ✅            | Sanitization documented in location repository                               |
| Auth    | ✅           | ✅            | `sanitizeSignUpInput` in `firestore-auth-repository.ts`                      |
| User    | ✅           | ✅            | `sanitizeUserCreate` methods in `firestore-user-repository.ts`               |
| Project | ❌           | ❌            | **INCONSISTENT** - Relies on Zod `.trim()`, no explicit sanitization methods |
| Notes   | ❓           | ❓            | No implementation found                                                      |

**Action Required:**

- Add explicit sanitization methods to `FirestoreProjectRepository` (follow User/Auth pattern)
- Project currently relies on Zod's implicit trimming, which is inconsistent with other modules

**Evidence:**

```1188:1207:docs/allProject.md
## Sanitization Process

**Note**: Projects do not have explicit sanitization methods in the repository layer. However, Zod schema validation applies trimming and type coercion.

**Implicit Sanitization via Zod**:
- String fields are trimmed by Zod schemas (`.trim()` in schema)
- `projectName`: Trimmed automatically
- `personInfo.firstName`, `personInfo.lastName`: Trimmed automatically
- Optional fields are normalized to undefined if null/empty
- Timestamps are converted to Date objects

**Repository Layer**:
- No explicit `sanitizeProject` method
- Validation happens through Zod schemas
- String trimming handled by Zod's `.trim()`

**Service Layer**:
- No explicit sanitization
- Validation and type coercion handled by Zod
```

---

### ✅ Real-time Subscriptions

| Module  | Table Status | Actual Status | Notes                                                                   |
| ------- | ------------ | ------------- | ----------------------------------------------------------------------- |
| Lists   | ✅           | ✅            | `enableRealtime` option in `use-list-actions.ts` (user & project lists) |
| Auth    | ❌           | ✅            | Correct - auth doesn't need real-time subscriptions                     |
| User    | ✅           | ✅            | `use-user-profile.ts` and `use-user-realtime.ts` hooks                  |
| Project | ✅           | ✅            | `subscribeToUserProjects` in `project-service.ts`                       |
| Notes   | ❓           | ❓            | No implementation found                                                 |

**Note:** Different types of subscriptions:

- **User**: Single document subscription (`subscribeToUser`)
- **Lists**: Document subscription (`subscribeToUserList`, `subscribeToProjectList`)
- **Project**: Query subscription (`subscribeToUserProjects`)

---

### ❌ Hooks Implemented

| Module  | Table Status | Actual Status | Notes                                                              |
| ------- | ------------ | ------------- | ------------------------------------------------------------------ |
| Lists   | ✅           | ✅            | `use-list-actions.ts` (useUserList, useProjectList)                |
| Auth    | ✅           | ✅            | `use-sign-in.ts`, `use-sign-up.ts`                                 |
| User    | ✅           | ✅            | `use-user-profile.ts`, `use-user-admin.ts`, `use-user-realtime.ts` |
| Project | ❌           | ❌            | **MISSING** - No hooks found (no `use-project*.ts` files)          |
| Notes   | ❓           | ❓            | No implementation found                                            |

**Action Required:**

- Create project hooks: `use-project.ts`, `use-projects.ts` following the User module pattern

---

### ⚠️ Caching Strategy

| Module  | Table Status | Actual Status | Notes                                                                                                    |
| ------- | ------------ | ------------- | -------------------------------------------------------------------------------------------------------- |
| Lists   | ❌           | ❌            | No caching found                                                                                         |
| Auth    | ❌           | ❌            | No caching found                                                                                         |
| User    | ✅           | ❌            | **MISSING** - Table says implemented, but code shows only mention in patterns, not actual implementation |
| Project | ❌           | ❌            | No caching found                                                                                         |

**Evidence:**

- `CachedFirestoreUserRepository` is shown in `.cursor/rules/project-patterns.mdc` as an example pattern
- Not actually implemented in `ServiceFactory.ts`
- User repository is used directly without caching wrapper

**Action Required:**

- Implement caching for User module if desired
- Or remove from table if not needed

---

### ❌ Rate Limiting

| Module  | Table Status | Actual Status | Notes                                                       |
| ------- | ------------ | ------------- | ----------------------------------------------------------- |
| Lists   | ❌           | ❌            | Not implemented                                             |
| Auth    | ✅           | ✅            | **PARTIALLY** - Only sign-in and sign-up have rate limiting |
| User    | ❌           | ❌            | Not implemented                                             |
| Project | ❌           | ❌            | Not implemented                                             |
| Notes   | ❓           | ❓            | Not implemented                                             |

**Evidence:**

```112:160:src/services/auth-service.ts
  async signIn(payload: SignInInput): Promise<Result<User, AppError>> {
    const context = ErrorContextBuilder.fromService('AuthService', 'signIn');
    const contextString = ErrorContextBuilder.toString(context);

    // Rate limiting
    const rateLimitKey = `signin-${payload.email.toLowerCase()}`;
    if (!signInRateLimiter.canAttempt(rateLimitKey)) {
      const timeUntilUnblocked = signInRateLimiter.getTimeUntilUnblocked(rateLimitKey);
      const minutesRemaining = Math.ceil(timeUntilUnblocked / 60000);

      return err(
        ErrorMapper.createGenericError(
          ErrorCode.AUTH_TOO_MANY_REQUESTS,
          'Too many sign-in attempts',
          `Too many failed sign-in attempts. Please try again in ${minutesRemaining} minutes.`,
          contextString,
          undefined,
          false,
        ),
      );
    }

    // Validate input
    const validationResult = validateWithSchema(signInInputSchema, payload, contextString);
    if (!validationResult.success) {
      return err(validationResult.error);
    }

    // Sign in - ensure rememberMe is always boolean (Zod default may not be inferred correctly)
    const validatedPayload: SignInInput = {
      ...validationResult.value,
      rememberMe: validationResult.value.rememberMe ?? false,
    };

    // Sign in
    const result = await this.authRepository.signIn(validatedPayload);

    // Reset rate limit on success
    if (result.success) {
      signInRateLimiter.reset(rateLimitKey);
    }

    // Get user profile
    if (result.success) {
      return this.userRepository.getById(result.value.id);
    }

    return result;
  }
```

**Action Required:**

- Table shows ❌ for all modules except Auth
- Auth has rate limiting for sign-in and sign-up, but password reset may also need it
- Consider rate limiting for sensitive user operations (profile updates, password changes)

---

### ❌ Pagination

| Module  | Table Status | Actual Status | Notes                                                                 |
| ------- | ------------ | ------------- | --------------------------------------------------------------------- |
| Lists   | ❌           | ❌            | Not implemented                                                       |
| Auth    | ❌           | ❌            | Not implemented                                                       |
| User    | ❌           | ✅            | **PARTIALLY** - `getAll()` method has `limit` and `offset` parameters |
| Project | ❌           | ❌            | **NEEDED** - Table says needed, not implemented                       |
| Notes   | ❓           | ❓            | Not implemented                                                       |

**Evidence:**

```441:454:src/repositories/firestore/firestore-user-repository.ts
  async getAll(limitCount?: number, offset?: number): Promise<Result<User[], AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'getAll');

    try {
      let q = query(collection(firestore, 'users'), orderBy('createdAt', 'desc'));

      if (limitCount) {
        q = query(q, limit(limitCount));
```

**Action Required:**

- Project module needs pagination for `getProjectsForUser()`
- Lists may need pagination if they grow large

---

### ✅ Orchestration (Project Unique)

| Module  | Table Status | Actual Status | Notes                                                                                 |
| ------- | ------------ | ------------- | ------------------------------------------------------------------------------------- |
| Lists   | ❌           | ✅            | **CORRECT** - Not needed for lists                                                    |
| Auth    | ❌           | ✅            | **CORRECT** - Not needed for auth                                                     |
| User    | ❌           | ✅            | **CORRECT** - Not needed for user                                                     |
| Project | ✅           | ✅            | **IMPLEMENTED** - `createProject` orchestrates multiple subcollection initializations |

**Evidence:**

```78:96:src/services/project-service.ts
    // 3. Orchestration: Copy user's master lists to the new project's subcollections
    // We use Promise.allSettled to ensure we try to copy all lists, even if one fails.
    const copyResults = await Promise.all([
      this.copyUserListToProject(userId, newProject.id, this.listRepositories.kit, 'kit'),
      this.copyUserListToProject(userId, newProject.id, this.listRepositories.task, 'task'),
      this.copyUserListToProject(
        userId,
        newProject.id,
        this.listRepositories.groupShot,
        'groupShot',
      ),
      this.copyUserListToProject(
        userId,
        newProject.id,
        this.listRepositories.coupleShot,
        'coupleShot',
      ),
      // TODO: Add other subcollection initializations here (e.g., Timeline, Locations)
    ]);
```

---

### ✅ Parallel Execution (Project Unique)

| Module  | Table Status | Actual Status | Notes                                                            |
| ------- | ------------ | ------------- | ---------------------------------------------------------------- |
| Lists   | ❌           | ✅            | **CORRECT** - Not needed                                         |
| Auth    | ❌           | ✅            | **CORRECT** - Not needed                                         |
| User    | ❌           | ✅            | **CORRECT** - Not needed                                         |
| Project | ✅           | ✅            | **IMPLEMENTED** - Uses `Promise.all()` for parallel list copying |

**Evidence:** Same as Orchestration above - `Promise.all()` executes all list copies in parallel.

---

### ✅ Partial Failure (Project Unique)

| Module  | Table Status | Actual Status | Notes                                                            |
| ------- | ------------ | ------------- | ---------------------------------------------------------------- |
| Lists   | ❌           | ✅            | **CORRECT** - Not needed                                         |
| Auth    | ❌           | ✅            | **CORRECT** - Not needed                                         |
| User    | ❌           | ✅            | **CORRECT** - Not needed                                         |
| Project | ✅           | ✅            | **IMPLEMENTED** - Collects failures and returns aggregated error |

**Evidence:**

```98:132:src/services/project-service.ts
    // Collect all failures
    const failures: Array<{ listName: string; error: AppError }> = [];
    const listNames = ['kit', 'task', 'groupShot', 'coupleShot'];

    copyResults.forEach((result, index) => {
      if (!result.success) {
        const listName = listNames[index] || 'unknown';
        failures.push({ listName, error: result.error });

        // Note: Using LoggingService directly here since these are intermediate errors
        // that will be aggregated into a single error returned to the caller.
        // The final aggregated error should be handled by AppErrorHandler in the hook.
        LoggingService.error(result.error, {
          component: this.context,
          method: 'createProject.subcollectionCopy',
          metadata: { listName, projectId: newProject.id, userId },
        });
      }
    });

    // If any operations failed, return an error
    if (failures.length > 0) {
      const errorMessages = failures.map(f => `${f.listName}: ${f.error.userMessage}`).join('; ');

      const contextString = ErrorContextBuilder.toString(context);
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.DB_WRITE_ERROR,
          `Failed to initialize ${failures.length} subcollection(s): ${errorMessages}`,
          'Failed to fully initialize project. Some features may not be available.',
          `${contextString}.subcollectionCopy`,
          failures.length === 1 ? failures[0].error : undefined,
        ),
      );
    }

    return ok(newProject);
```

---

### ⚠️ Aggregated Errors

| Module  | Table Status | Actual Status | Notes                                                                            |
| ------- | ------------ | ------------- | -------------------------------------------------------------------------------- |
| Lists   | ❌           | ✅            | **CORRECT** - Not needed                                                         |
| Auth    | ❌           | ✅            | **CORRECT** - Not needed                                                         |
| User    | ❌           | ✅            | **CORRECT** - Not needed                                                         |
| Project | ⚠️           | ✅            | **IMPLEMENTED** - Uses custom format (multiple failures in single error message) |

**Note:** Project uses `ErrorMapper.createGenericError()` with concatenated error messages rather than a dedicated aggregated error type. The table shows ⚠️ which may indicate it's not using the standard `ErrorMapper.createAggregatedError()` method.

**Action Required:**

- Consider refactoring to use `ErrorMapper.createAggregatedError()` if available, or document that the current format is acceptable

---

### ❌ Progress Tracking

| Module  | Table Status | Actual Status | Notes                                                                              |
| ------- | ------------ | ------------- | ---------------------------------------------------------------------------------- |
| Lists   | ❌           | ❌            | Not implemented                                                                    |
| Auth    | ❌           | ❌            | Not implemented                                                                    |
| User    | ❌           | ❌            | Not implemented                                                                    |
| Project | ❌           | ❌            | **NEEDED** - `createProject` has multi-step operations but doesn't report progress |

**Evidence:**

- `loadingWithProgress()` helper exists in `loading-state.ts`
- Not used in `project-service.ts` `createProject()` method
- Could show: "Validating" → "Creating project" → "Initializing kit list" → "Initializing task list" → etc.

**Action Required:**

- Add progress tracking to `createProject()` operation
- Update hooks to consume progress state

---

### ⚠️ Retry Mechanism

| Module  | Table Status | Actual Status | Notes                                                                                           |
| ------- | ------------ | ------------- | ----------------------------------------------------------------------------------------------- |
| Lists   | ✅           | ❌            | **MISMATCH** - Table says implemented, code shows not used                                      |
| Auth    | ❌           | ❌            | Not implemented                                                                                 |
| User    | ❌           | ❌            | Not implemented                                                                                 |
| Project | ❌           | ❌            | **NEEDED** - Table says needed, but retry could help with subcollection initialization failures |

**Evidence:**

- `withRetry()` utility exists in `error-recovery.ts`
- Not used anywhere in the codebase
- Lists table shows ✅ but no retry logic found in list operations

**Action Required:**

- Clarify if retry is actually needed for Lists
- Consider adding retry to Project's `createProject()` subcollection initialization
- Or remove from table if not needed

---

### ✅ Fallback Chain (Project Unique)

| Module  | Table Status | Actual Status | Notes                                                              |
| ------- | ------------ | ------------- | ------------------------------------------------------------------ |
| Lists   | ❌           | ✅            | **CORRECT** - Not needed                                           |
| Auth    | ❌           | ✅            | **CORRECT** - Not needed                                           |
| User    | ❌           | ✅            | **CORRECT** - Not needed                                           |
| Project | ✅           | ✅            | **IMPLEMENTED** - Falls back to master list if user list not found |

**Evidence:**

```157:178:src/services/project-service.ts
    // 1. Get the user's master list (or the global master if user has none)
    const listResult = await repository.getUserList(userId);
    let sourceList: TList;

    if (listResult.success) {
      sourceList = listResult.value;
    } else {
      // Fallback to global master list
      const masterListResult = await repository.getMaster();
      if (!masterListResult.success) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.DB_NOT_FOUND,
            `Failed to get master list for ${listName}: ${masterListResult.error.message}`,
            `Unable to initialize ${listName} list. Please try again.`,
            contextString,
            masterListResult.error,
            false,
          ),
        );
      }
      sourceList = masterListResult.value;
    }
```

---

### ❌ Test Documentation

| Module  | Table Status | Actual Status | Notes                              |
| ------- | ------------ | ------------- | ---------------------------------- |
| Lists   | ✅           | ❌            | **MISMATCH** - No test files found |
| Auth    | ✅           | ❌            | **MISMATCH** - No test files found |
| User    | ✅           | ❌            | **MISMATCH** - No test files found |
| Project | ❌           | ❌            | No test files found                |
| Notes   | ❓           | ❓            | No test files found                |

**Evidence:**

- `glob_file_search` for `**/*test*.ts` returned 0 files
- Test patterns exist in `.cursor/rules/testing-standards.mdc` but no actual tests

**Action Required:**

- Table shows ✅ for Lists/Auth/User but tests don't exist
- Either add tests or update table to reflect actual status

---

### ❌ ADR Documentation

| Module  | Table Status | Actual Status | Notes              |
| ------- | ------------ | ------------- | ------------------ |
| Lists   | ❌           | ❌            | No ADR files found |
| Auth    | ❌           | ❌            | No ADR files found |
| User    | ❌           | ❌            | No ADR files found |
| Project | ❌           | ❌            | No ADR files found |
| Notes   | ❓           | ❓            | No ADR files found |

**Evidence:**

- `glob_file_search` for `**/ADR*.md` returned 0 files
- No Architecture Decision Records found

**Action Required:**

- Consider adding ADRs for major architectural decisions if desired

---

## Summary of Discrepancies

### Critical Issues (Mismatches Between Table and Code)

1. **Project Sanitization**: Table shows ❌ but code actually relies on Zod trimming (inconsistent with other modules)
2. **Project Hooks**: Table shows ❌ but code confirms missing - needs implementation
3. **User Caching**: Table shows ✅ but code shows only pattern example, not actual implementation
4. **Lists Retry**: Table shows ✅ but no retry logic found in code
5. **Test Documentation**: Table shows ✅ for Lists/Auth/User but no test files exist

### Missing Features (Table Shows Needed/Missing)

1. **Project Pagination**: Needed but not implemented
2. **Project Progress Tracking**: Needed but not implemented (utility exists, not used)
3. **Project Retry**: Needed but not implemented (utility exists, not used)

### Notes Module Status

- **Status**: Incomplete - only schemas exist, no service/repository/hooks
- Needs full implementation following other module patterns

---

## Recommended Actions

### High Priority

1. ✅ **Create Project Hooks** (`use-project.ts`, `use-projects.ts`)
2. ✅ **Add Explicit Sanitization to Project Repository** (follow User/Auth pattern)
3. ✅ **Add Progress Tracking to Project Creation** (use existing `loadingWithProgress`)
4. ✅ **Clarify/Create Tests** - Either implement tests or update table
5. ✅ **Add Pagination to Project Module** (`getProjectsForUser`)

### Medium Priority

6. ⚠️ **Review Retry Mechanism** - Confirm if needed for Lists, add to Project if beneficial
7. ⚠️ **Implement User Caching** - Or remove from table if not needed
8. ⚠️ **Standardize Aggregated Errors** - Use dedicated aggregated error type if available

### Low Priority

9. 📝 **Add ADR Documentation** - If architectural documentation is desired
10. 📝 **Complete Notes Module** - Implement full Notes service/repository/hooks if needed

---

_Document generated: $(date)_
_Last updated: Based on codebase analysis_
