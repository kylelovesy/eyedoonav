# Error Handling Quick Reference Guide

## Common Patterns & Code Snippets

### 1. Service Error Handling Pattern

```typescript
// ✅ Good: Using Result pattern
async function fetchData(id: string): Promise<Result<Data, AppError>> {
  const context = `${this.context}.fetchData`;

  const result = await this.repository.get(id);
  if (!result.success) {
    return err(ErrorMapper.fromFirestore(result.error, context));
  }

  return ok(result.value);
}

// ❌ Bad: Using try/catch
async function fetchData(id: string): Promise<Data> {
  try {
    return await this.repository.get(id);
  } catch (error) {
    throw error; // Don't do this
  }
}
```

### 2. Hook Error Handling Pattern

```typescript
function useCustomData(userId: string | null) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    const result = await service.getData(userId);
    if (!result.success) {
      const appError = result.error;
      setError(appError);

      // Handle error (log + show toast)
      AppErrorHandler.handle(appError, 'useCustomData.fetchData', fetchData);
    } else {
      setData(result.value);
    }

    setIsLoading(false);
  }, [userId]);

  return { data, error, isLoading, refetch: fetchData };
}
```

### 3. Component Error Handling Pattern

```typescript
function MyComponent() {
  const { data, error, isLoading, refetch } = useCustomData(userId);

  // Option 1: Display inline error
  if (error) {
    return <ErrorMessage error={error} onRetry={refetch} />;
  }

  // Option 2: Let toast handle it, show placeholder
  if (error) {
    return <EmptyState message="Failed to load data" />;
  }

  return <DataDisplay data={data} />;
}
```

### 4. Error Mapper Usage

```typescript
// From Firestore error
const error = ErrorMapper.fromFirestore(firebaseError, 'MyService.getData');

// From Zod validation error
const error = ErrorMapper.fromZod(zodError, 'MyService.validateInput');

// From Firebase Auth error
const error = ErrorMapper.fromFirebaseAuth(authError, 'AuthService.signIn');

// Common error helpers
const error = ErrorMapper.userNotFound('AuthService.signIn');
const error = ErrorMapper.projectNotFound('ProjectService.getProject');
const error = ErrorMapper.listNotFound('ListService.getList');
```

### 5. Error Recovery Usage

```typescript
// Simple retry
const result = await withRetry(() => service.fetchData(), {
  maxAttempts: 3,
  delayMs: 1000,
  exponential: true,
});

// With fallback
const result = await withFallback(() => service.fetchData(), defaultData);

// With timeout
const result = await withTimeout(
  () => service.fetchData(),
  5000, // 5 seconds
);

// Combined strategies
const result = await withRecoveryStrategies(() => service.fetchData(), {
  retry: { maxAttempts: 2, delayMs: 500 },
  timeout: 5000,
  fallback: defaultData,
});

// Circuit breaker
const breaker = new CircuitBreaker(() => externalService.call(), {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
});
const result = await breaker.execute();
```

### 6. Error Handler Usage

```typescript
// Basic usage
AppErrorHandler.handle(error, 'MyComponent.handleSubmit');

// With retry action
AppErrorHandler.handle(
  error,
  'MyComponent.handleSubmit',
  () => handleSubmit(), // Retry function
);

// The handler will:
// 1. Log the error via LoggingService
// 2. Show toast notification (with deduplication)
// 3. Add retry button if error is retryable
```

### 7. Logging Patterns

```typescript
// Info logging
LoggingService.log('User logged in', {
  component: 'AuthService',
  method: 'signIn',
  userId: user.id,
});

// Warning logging
LoggingService.warn('Slow operation detected', {
  component: 'DataService',
  method: 'fetchLargeDataset',
  duration: 5000,
});

// Error logging (usually done by AppErrorHandler)
LoggingService.error(error, {
  component: 'DataService',
  method: 'fetchData',
  userId: user.id,
  metadata: { attempt: 2 },
});

// Service call logging
LoggingService.logServiceCall(
  'DataService',
  'fetchData',
  150,
  true, // success
);

// User action logging
LoggingService.logUserAction('project_created', {
  projectId: '123',
  userId: '456',
});
```

### 8. Error Boundary Usage

```typescript
// Wrap entire app
<ErrorBoundary>
  <App />
</ErrorBoundary>

// Wrap specific component
<ErrorBoundary
  fallback={(error, reset) => <CustomErrorUI error={error} onReset={reset} />}
  onError={(error, errorInfo) => {
    // Custom error handling
  }}
>
  <RiskyComponent />
</ErrorBoundary>

// With HOC
const SafeComponent = withErrorBoundary(RiskyComponent);
```

### 9. Creating Custom Errors

```typescript
// Using existing error classes
const error = new AuthError(
  ErrorCode.AUTH_INVALID_CREDENTIALS,
  'Invalid email or password provided',
  'Email or password is incorrect. Please try again.',
  'AuthService.signIn',
  originalError,
  true, // retryable
);

const error = new FirestoreError(
  ErrorCode.DB_NOT_FOUND,
  'User document not found',
  'User account not found',
  'UserService.getUser',
  originalError,
  false, // not retryable
);

// Validation error
const error = new ValidationError(
  'Input validation failed',
  { email: 'Invalid email format', password: 'Password too short' },
  'AuthService.signUp',
  zodError,
);
```

### 10. Error Context Best Practices

```typescript
// ✅ Good: Descriptive context
const context = `${this.context}.${methodName}`;
// Result: "AuthService.signIn"

// ✅ Good: Include relevant IDs
const context = {
  component: 'UserService',
  method: 'updateProfile',
  userId: user.id,
  metadata: { field: 'displayName' },
};

// ❌ Bad: Vague context
const context = 'error';
const context = 'failed';
```

---

## Error Code Decision Tree

```
Is it a validation error?
  → Use ValidationError with ErrorCode.VALIDATION_FAILED

Is it a network/API error?
  → Use NetworkError with:
    - NETWORK_TIMEOUT (timeout)
    - NETWORK_CONNECTION_ERROR (connection failed)
    - NETWORK_SERVER_ERROR (server error)

Is it a Firestore error?
  → Use FirestoreError with:
    - DB_NOT_FOUND (document not found)
    - DB_PERMISSION_DENIED (permission denied)
    - DB_NETWORK_ERROR (network issue, retryable)

Is it an auth error?
  → Use AuthError with appropriate AUTH_* code

Is it a storage error?
  → Use FirebaseStorageError with FIREBASE_STORAGE_* codes

Is it a location/geocoding error?
  → Use LocationError with LOC_* codes

Is it something else?
  → Use appropriate error class or create new one
```

---

## When to Use Error Recovery

```
Network operations → withRetry + withTimeout
Optional features → withFallback
External services → CircuitBreaker
High concurrency → Bulkhead
Critical operations → Combine strategies
```

---

## Common Mistakes to Avoid

❌ **Don't:** Use try/catch in service layer
✅ **Do:** Use Result pattern

❌ **Don't:** Throw errors in services
✅ **Do:** Return `err(AppError)`

❌ **Don't:** Log errors manually
✅ **Do:** Use `AppErrorHandler.handle()`

❌ **Don't:** Show raw error messages to users
✅ **Do:** Use `error.userMessage`

❌ **Don't:** Create errors without context
✅ **Do:** Always provide meaningful context

❌ **Don't:** Retry non-retryable errors
✅ **Do:** Check `error.retryable` before retrying

❌ **Don't:** Ignore errors in hooks
✅ **Do:** Handle errors and update state

---

## Migration Checklist for Existing Code

When updating existing code to use new error handling:

1. [ ] Replace try/catch with Result pattern
2. [ ] Convert error objects to AppError using ErrorMapper
3. [ ] Add context to all errors (service.method format)
4. [ ] Replace console.error with LoggingService.error
5. [ ] Use AppErrorHandler.handle() in hooks/components
6. [ ] Add error state to hooks
7. [ ] Provide retry mechanisms where appropriate
8. [ ] Update UI to show error.userMessage (not error.message)
9. [ ] Test error scenarios
10. [ ] Verify toast notifications appear

---

## File Structure Reference

```
src/
├── domain/
│   └── common/
│       ├── errors.ts          # Error classes & codes
│       └── result.ts          # Result<T, E> type
├── services/
│   ├── logging-service.ts     # Logging functionality
│   ├── error-handler-service.ts  # Error side-effects
│   └── global-error-handler.ts   # Global error handling
├── utils/
│   ├── error-mapper.ts        # Error conversion utilities
│   └── error-recovery.ts      # Recovery strategies
├── components/
│   └── common/
│       ├── error-boundary.tsx # React error boundary
│       └── toast.tsx          # Toast notifications
└── stores/
    └── use-ui-store.ts        # Toast state management
```
