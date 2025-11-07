# Error Handling & Logging Implementation Plan

## Executive Summary

This plan outlines the implementation and improvement of the error handling and logging system for the Eye-Doo application. The goal is to create a robust, type-safe, and user-friendly error handling system that integrates seamlessly with the existing Result<T, E> pattern and logging infrastructure.

---

## Current State Analysis

### ✅ What's Already in Place

1. **Error Domain Layer** (`src/domain/common/errors.ts`)
   - Comprehensive `ErrorCode` enum with categorized codes
   - `AppError` interface as base contract
   - Domain-specific error classes (AuthError, FirestoreError, etc.)
   - User-friendly messages and retry logic support

2. **Result Pattern** (`src/domain/common/result.ts`)
   - Railway-oriented programming implementation
   - Type-safe `Result<T, E>` with `ok()` and `err()` helpers
   - Type guards (`isOk`, `isErr`)

3. **Logging Service** (`src/services/logging-service.ts`)
   - Basic logging with console output (dev mode)
   - Sentry integration prepared (commented out)
   - Structured logging for service calls, user actions, state changes
   - Re-entrant error prevention

4. **Error Mapper** (`src/utils/error-mapper.ts`)
   - Maps Firebase/Firestore errors to domain errors
   - Zod validation error mapping
   - Helper methods for common error scenarios

5. **Error Boundary** (`src/components/common/error-boundary.tsx`)
   - React error boundary for catching component errors
   - Default fallback UI
   - Error logging integration

6. **Service Layer Pattern**
   - Services use `Result<T, AppError>` return types
   - ErrorMapper used for error conversion
   - Some try/catch blocks still present (needs refactoring)

### ⚠️ Issues Identified

1. **Error Handler Service Issues:**
   - References `useUIStore` which doesn't exist
   - No actual toast system integration
   - Toast deduplication logic is good but needs testing

2. **Error Recovery Utilities Issues:**
   - `AppError` is an interface, not a class - cannot use `new AppError()`
   - Missing proper error type creation in recovery utilities
   - Circuit breaker and bulkhead need more robust implementations
   - Missing timeout error code in ErrorCode enum

3. **Missing Components:**
   - Global error handler for unhandled promise rejections
   - UI store/toast system
   - Integration layer between error handler and UI
   - Error analytics/reporting service
   - Error recovery middleware/decorator

4. **Code Quality:**
   - Some services still use try/catch instead of Result pattern
   - Inconsistent error context propagation
   - Missing error boundaries in key areas
   - No error rate limiting/throttling

---

## Implementation Plan

### Phase 1: Foundation Fixes

### Task 1.1: Fix Error Recovery Utilities

**Priority: High** | **Estimated Time: 2-3 hours**

**Issues:**

- `AppError` is an interface, not a class - recovery utilities try to instantiate it
- Missing error code for timeout scenarios
- Need proper error creation helpers

**Actions:**

1. Add `TIMEOUT_ERROR` to `ErrorCode` enum
2. Create a generic error factory helper in `error-mapper.ts`:
   ```typescript
   static createGenericError(
     code: ErrorCode,
     message: string,
     userMessage: string,
     context?: string,
     originalError?: unknown,
     retryable = false
   ): AppError
   ```
3. Update error recovery utilities to use proper error classes:
   - Timeout errors → `NetworkError` with `ErrorCode.NETWORK_TIMEOUT`
   - Circuit breaker errors → `NetworkError` with new `ErrorCode.CIRCUIT_BREAKER_OPEN`
   - Generic recovery errors → appropriate error classes

4. Fix `withTimeout`, `CircuitBreaker`, and other utilities to properly create errors

### Task 1.2: Create UI Store for Toast Notifications

**Priority: High** | **Estimated Time: 3-4 hours**

**Actions:**

1. Create `src/stores/use-ui-store.ts` using Zustand (or your preferred state management)

   ```typescript
   interface ToastConfig {
     title?: string;
     message: string;
     type: 'success' | 'error' | 'warning' | 'info';
     duration?: number;
     action?: {
       label: string;
       onPress: () => void;
     };
   }

   interface UIStore {
     toasts: ToastConfig[];
     showToast: (config: ToastConfig) => void;
     dismissToast: (id: string) => void;
   }
   ```

2. Create a Toast component (`src/components/common/toast.tsx`)
   - Display toast notifications
   - Handle multiple toasts
   - Auto-dismiss after duration
   - Support action buttons

3. Integrate toast component into root layout

### Task 1.3: Fix Error Handler Service

**Priority: High** | **Estimated Time: 1-2 hours**

**Actions:**

1. Update `error-handler-service.ts` to use the new UI store
2. Improve logging context:
   ```typescript
   LoggingService.error(error, {
     component: 'AppErrorHandler',
     method: 'handle',
     userId: contextData.userId,
     errorCode: error.code,
     metadata: { retryable: error.retryable },
   });
   ```
3. Add error categorization for different handling strategies
4. Add unit tests for toast deduplication logic

### Task 1.4: Add Missing Error Codes

**Priority: Medium** | **Estimated Time: 30 minutes**

**Actions:**
Add to `ErrorCode` enum:

- `CIRCUIT_BREAKER_OPEN = 'NET_004'`
- `OPERATION_CANCELLED = 'GEN_002'` (if needed)
- Review existing codes for completeness

---

### Phase 2: Global Error Handling

### Task 2.1: Create Global Error Handler Service

**Priority: High** | **Estimated Time: 3-4 hours**

**Actions:**

1. Create `src/services/global-error-handler.ts`:

   ```typescript
   class GlobalErrorHandler {
     static initialize(): void {
       // Handle unhandled promise rejections
       // Handle native crashes
       // Set up error boundary integration
     }

     static handleUnhandledRejection(reason: unknown): void;
     static handleNativeCrash(error: Error): void;
   }
   ```

2. Integrate with React Native's error handling:
   - `ErrorUtils.setGlobalHandler()`
   - `Promise rejection tracking`
   - Native exception handlers (iOS/Android)

3. Map global errors to `AppError` types
4. Route to `AppErrorHandler.handle()`

### Task 2.2: Enhance Error Boundary

**Priority: Medium** | **Estimated Time: 2-3 hours**

**Actions:**

1. Add error categorization in boundary:
   - Critical errors → full screen fallback
   - Non-critical errors → in-place error display
2. Add error reporting UI for critical errors
3. Add "Report Error" functionality (for production)
4. Improve error context capture:
   - Component stack
   - User actions leading to error
   - Redux/Zustand state snapshots (if applicable)

---

### Phase 3: Service Layer Improvements

### Task 3.1: Refactor Services to Pure Result Pattern

**Priority: Medium** | **Estimated Time: 6-8 hours**

**Actions:**

1. Remove all `try/catch` blocks from services
2. Wrap all async operations in Result pattern:

   ```typescript
   // Instead of:
   try {
     const result = await operation();
     return ok(result);
   } catch (error) {
     return err(ErrorMapper.fromFirestore(error, context));
   }

   // Use wrapper utility:
   return await wrapAsyncOperation(
     () => operation(),
     error => ErrorMapper.fromFirestore(error, context),
     context,
   );
   ```

3. Create utility helpers in `src/utils/result-helpers.ts`:

   ```typescript
   export async function wrapAsyncOperation<T, E extends AppError>(
     operation: () => Promise<T>,
     errorMapper: (error: unknown) => E,
     context?: string,
   ): Promise<Result<T, E>>;
   ```

4. Update services:
   - `portal-service.ts` (has multiple try/catch)
   - `business-card-service.ts` (has try/catch in `saveBusinessCardWithQR`)
   - Any other services with try/catch

### Task 3.2: Add Error Context Propagation

**Priority: Medium** | **Estimated Time: 2-3 hours**

**Actions:**

1. Create context builder utility:

   ```typescript
   class ErrorContextBuilder {
     static fromService(serviceName: string, method: string): LogContext;
     static fromRepository(repoName: string, method: string): LogContext;
     static fromHook(hookName: string, method: string): LogContext;
   }
   ```

2. Update all services to use consistent context format
3. Add request ID/trace ID for error correlation (optional)

---

### Phase 4: Error Recovery Integration

### Task 4.1: Create Error Recovery Middleware

**Priority: Medium** | **Estimated Time: 4-5 hours**

**Actions:**

1. Create service wrapper/decorator:

   ```typescript
   function withErrorRecovery<T, E extends AppError>(
     service: Service,
     options: RecoveryOptions,
   ): Service;
   ```

2. Integrate recovery strategies:
   - Auto-retry for retryable errors
   - Circuit breaker for external services
   - Fallback values for non-critical operations

3. Apply to critical services:
   - Auth service
   - Data fetching services
   - Network-dependent operations

### Task 4.2: Add Recovery Configuration

**Priority: Low** | **Estimated Time: 2 hours**

**Actions:**

1. Create recovery config per operation type:

   ```typescript
   const RECOVERY_CONFIGS = {
     auth: { maxRetries: 2, timeout: 5000, useCircuitBreaker: true },
     dataFetch: { maxRetries: 3, timeout: 10000, useCircuitBreaker: false },
     // ...
   };
   ```

2. Make recovery strategies configurable per service
3. Add monitoring/logging for recovery attempts

---

### Phase 5: Logging Enhancements

### Task 5.1: Enhance Logging Service

**Priority: Medium** | **Estimated Time: 3-4 hours**

**Actions:**

1. Add log levels configuration:

   ```typescript
   enum LogLevel {
     DEBUG = 0,
     INFO = 1,
     WARN = 2,
     ERROR = 3,
   }
   ```

2. Add log filtering (by level, component, etc.)
3. Add structured logging format (JSON in production)
4. Add log sampling for high-frequency logs
5. Add performance logging decorator:
   ```typescript
   function logPerformance(target: any, propertyKey: string, descriptor: PropertyDescriptor);
   ```

### Task 5.2: Integrate Sentry (Production Ready)

**Priority: Low** | **Estimated Time: 2-3 hours**

**Actions:**

1. Install `@sentry/react-native`
2. Configure Sentry with:
   - DSN from environment variables
   - Release tracking
   - User context
   - Breadcrumbs
   - Error grouping
3. Uncomment and configure Sentry calls in `logging-service.ts`
4. Add error sampling (don't send all errors)
5. Add source map upload for better stack traces

### Task 5.3: Add Log Analytics

**Priority: Low** | **Estimated Time: 2 hours**

**Actions:**

1. Add log aggregation endpoint (if using custom backend)
2. Track error rates by:
   - Error code
   - Component/service
   - User segment
   - Time period
3. Create error dashboard/reports (optional)

---

### Phase 6: Hook Integration

### Task 6.1: Update Custom Hooks

**Priority: High** | **Estimated Time: 3-4 hours**

**Actions:**

1. Review hooks (`use-business-card.ts`, `use-list-actions.ts`, `use-portal-actions.ts`)
2. Integrate `AppErrorHandler.handle()` in hooks:

   ```typescript
   const result = await service.operation();
   if (!result.success) {
     AppErrorHandler.handle(result.error, context, () => retryOperation());
     return; // Set error state
   }
   // Handle success
   ```

3. Add error state management in hooks:

   ```typescript
   const [error, setError] = useState<AppError | null>(null);
   const [isRetrying, setIsRetrying] = useState(false);
   ```

4. Provide retry mechanisms in hook return values

### Task 6.2: Create Error Hook Utility

**Priority: Medium** | **Estimated Time: 2 hours**

**Actions:**

1. Create `use-error-handler.ts` hook:

   ```typescript
   function useErrorHandler() {
     const handleError = useCallback((error: AppError, retryAction?: () => void) => {
       AppErrorHandler.handle(error, undefined, retryAction);
     }, []);

     return { handleError };
   }
   ```

2. Use in components for consistent error handling

---

### Phase 7: Testing & Documentation

### Task 7.1: Add Error Handling Tests

**Priority: Medium** | **Estimated Time: 4-5 hours**

**Actions:**

1. Unit tests for:
   - `ErrorMapper` (all mapping methods)
   - `AppErrorHandler` (toast deduplication, logging)
   - Error recovery utilities (retry, timeout, circuit breaker)
   - Error boundary component

2. Integration tests:
   - Service error propagation
   - Error handler integration
   - Toast display logic

3. Error scenarios testing:
   - Network failures
   - Permission errors
   - Validation errors
   - Unexpected errors

### Task 7.2: Create Error Handling Documentation

**Priority: Low** | **Estimated Time: 2-3 hours**

**Actions:**

1. Create `docs/error-handling-guide.md`:
   - Error handling architecture
   - When to use which error class
   - How to add new error codes
   - How to handle errors in services
   - How to handle errors in components
   - Recovery strategies guide
   - Best practices

2. Add JSDoc comments to all public APIs
3. Create examples/recipes for common scenarios

---

### Phase 8: Monitoring & Observability

### Task 8.1: Add Error Metrics

**Priority: Low** | **Estimated Time: 2-3 hours**

**Actions:**

1. Track error metrics:
   - Error frequency by code
   - Error rates over time
   - Recovery success rates
   - User impact (critical vs non-critical)

2. Add performance monitoring:
   - Service call durations
   - Error recovery times
   - Circuit breaker state changes

### Task 8.2: Create Error Dashboard (Optional)

**Priority: Very Low** | **Estimated Time: 4-6 hours**

**Actions:**

1. Create internal admin dashboard
2. Display:
   - Error trends
   - Most common errors
   - Affected users
   - Recovery statistics

---

## Implementation Priority Matrix

### 🔴 Critical (Do First)

1. Fix error recovery utilities (Task 1.1)
2. Create UI store for toasts (Task 1.2)
3. Fix error handler service (Task 1.3)
4. Update hooks to use error handler (Task 6.1)

### 🟡 High Priority (Do Soon)

1. Create global error handler (Task 2.1)
2. Refactor services to pure Result pattern (Task 3.1)
3. Enhance logging service (Task 5.1)

### 🟢 Medium Priority (Do Later)

1. Add missing error codes (Task 1.4)
2. Enhance error boundary (Task 2.2)
3. Add error context propagation (Task 3.2)
4. Create error recovery middleware (Task 4.1)
5. Create error hook utility (Task 6.2)
6. Add error handling tests (Task 7.1)

### ⚪ Low Priority (Nice to Have)

1. Recovery configuration (Task 4.2)
2. Integrate Sentry (Task 5.2)
3. Log analytics (Task 5.3)
4. Documentation (Task 7.2)
5. Error metrics (Task 8.1)
6. Error dashboard (Task 8.2)

---

## Technical Architecture

### Error Flow Diagram

```
┌─────────────────┐
│   User Action    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Service Layer  │──→ Returns Result<T, AppError>
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
Success    Error
    │         │
    │         ▼
    │  ┌──────────────────┐
    │  │  Error Mapper    │──→ Maps to domain error
    │  └────────┬─────────┘
    │           │
    │           ▼
    │  ┌──────────────────┐
    │  │ Error Handler    │──→ Logs + Shows Toast
    │  └────────┬─────────┘
    │           │
    │           ▼
    │  ┌──────────────────┐
    │  │ Error Recovery   │──→ Retry/Fallback/Timeout
    │  └──────────────────┘
    │
    ▼
┌─────────────────┐
│  Hook/Component │──→ Updates UI state
└─────────────────┘
```

### Component Relationships

```
AppErrorHandler
    ├── LoggingService (logs errors)
    ├── UIStore (shows toasts)
    └── ErrorMapper (maps unknown errors)

ErrorRecovery Utilities
    ├── withRetry (retry logic)
    ├── withFallback (default values)
    ├── withTimeout (timeout handling)
    ├── CircuitBreaker (prevent cascading failures)
    └── Bulkhead (resource isolation)

GlobalErrorHandler
    ├── AppErrorHandler (routes to handler)
    └── ErrorUtils (React Native error handling)
```

---

## Testing Strategy

### Unit Tests

- Error creation and mapping
- Error handler logic (deduplication, logging)
- Recovery utilities (retry, timeout, circuit breaker)
- Error mapper conversions

### Integration Tests

- Service → Error Handler → UI flow
- Error recovery strategies in action
- Error boundary catching component errors

### E2E Tests

- User-facing error scenarios
- Error toast display
- Retry functionality
- Error boundary fallback UI

---

## Migration Checklist

When implementing error handling in existing code:

- [ ] Replace try/catch with Result pattern
- [ ] Use ErrorMapper for error conversion
- [ ] Add proper context to all errors
- [ ] Integrate AppErrorHandler.handle() in hooks/components
- [ ] Add error state to hooks
- [ ] Provide retry mechanisms
- [ ] Update error boundary for new components
- [ ] Test error scenarios
- [ ] Verify logging output
- [ ] Check toast notifications work

---

## Performance Considerations

1. **Logging Performance:**
   - Use log sampling for high-frequency operations
   - Buffer logs before sending (if using remote logging)
   - Don't log in hot paths (use conditional logging)

2. **Error Recovery:**
   - Don't retry non-retryable errors
   - Limit retry attempts to prevent infinite loops
   - Use exponential backoff for network retries

3. **Toast Deduplication:**
   - Current 5-second window is good
   - Consider memory cleanup for old entries
   - Monitor toast queue size

4. **Circuit Breaker:**
   - Don't open circuit breaker for non-transient errors
   - Consider half-open state testing interval

---

## Future Enhancements

1. **Error Predictions:**
   - Machine learning for error prediction
   - Proactive error prevention

2. **User Feedback:**
   - Allow users to report errors with context
   - Error reporting UI integrated with error boundary

3. **Error Analytics:**
   - Real-time error dashboards
   - Error trend analysis
   - Impact analysis (affected features/users)

4. **A/B Testing:**
   - Test different error messages
   - Test recovery strategies
   - Optimize user-facing messages

---

## Estimated Total Time

- **Critical Tasks:** 12-15 hours
- **High Priority Tasks:** 12-15 hours
- **Medium Priority Tasks:** 15-20 hours
- **Low Priority Tasks:** 10-15 hours

**Total: 49-65 hours** (approximately 1.5-2 weeks of focused development)

---

## Success Criteria

✅ All errors properly mapped to domain errors  
✅ All errors logged with context  
✅ Users see friendly error messages  
✅ Retry mechanisms work correctly  
✅ Error boundaries catch component errors  
✅ No unhandled promise rejections  
✅ Recovery strategies prevent cascading failures  
✅ Error handling is consistent across codebase  
✅ Error handling is testable  
✅ Documentation is comprehensive

---

## Notes

- This plan assumes Zustand for state management (adjust if using different solution)
- Sentry integration is optional but recommended for production
- Error recovery strategies should be applied judiciously (not everywhere)
- Consider error handling performance impact on user experience
- Review error messages with UX team for user-facing messages
