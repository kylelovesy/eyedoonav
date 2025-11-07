# Standardization Patterns

This document outlines the standardized patterns used across all modules in the Eye-Doo application. These patterns ensure consistency, maintainability, and reliability.

## Table of Contents

1. [Repository Layer Patterns](#repository-layer-patterns)
2. [Service Layer Patterns](#service-layer-patterns)
3. [Hook Patterns](#hook-patterns)
4. [Error Context Patterns](#error-context-patterns)
5. [Validation Patterns](#validation-patterns)
6. [Sanitization Patterns](#sanitization-patterns)
7. [Optimistic Updates Pattern](#optimistic-updates-pattern)

---

## Repository Layer Patterns

### Sanitization Method Naming

All repositories must follow consistent naming for sanitization methods:

- `sanitize*Create` - For creation inputs (e.g., `sanitizeProfileCreate`)
- `sanitize*Update` - For update inputs (e.g., `sanitizeProfileUpdate`)
- `sanitize*Input` - For general inputs (e.g., `sanitizePortalInput`)

**Example:**

```typescript
private sanitizeProfileCreate(payload: UserProfileCreate): UserProfileCreate {
  return {
    ...payload,
    name: sanitizePersonInfo(payload.name),
    bio: payload.bio ? sanitizeString(payload.bio) || null : null,
  };
}
```

### Error Context in Repositories

All repository methods must use `ErrorContextBuilder.fromRepository()`:

```typescript
async create(userId: string, payload: UserCreate): Promise<Result<User, AppError>> {
  const context = ErrorContextBuilder.fromRepository(
    this.context,
    'create',
    userId,        // if applicable
    projectId,     // if applicable
    { metadata }   // optional metadata
  );
  const contextString = ErrorContextBuilder.toString(context);

  try {
    // ... implementation
  } catch (error) {
    return err(ErrorMapper.fromFirestore(error, contextString));
  }
}
```

### Defensive Parsing

All repositories must use defensive parsing with `validateWithSchema` in `parseSnapshot` methods:

```typescript
private parseSnapshot(
  snapshot: DocumentSnapshot,
  contextString: string,
): Result<User, AppError> {
  if (!snapshot.exists()) {
    return err(
      ErrorMapper.createGenericError(
        ErrorCode.DB_NOT_FOUND,
        'User not found',
        'User not found',
        contextString,
      ),
    );
  }

  // Convert Firestore data (with Timestamps) to data with Date objects
  const rawData = snapshot.data();
  const data = convertAllTimestamps({ id: snapshot.id, ...rawData });

  // Validate with schema (DEFENSIVE parsing FROM Firestore)
  const validationResult = validateWithSchema(userSchema, data, contextString);

  if (!validationResult.success) {
    return err(validationResult.error);
  }

  return ok(validationResult.value as User);
}
```

### Timestamp Handling

- **Writes**: Use `serverTimestamp()` for `createdAt` and `updatedAt`
- **Reads**: Use `convertAllTimestamps()` to convert Firestore Timestamps to Date objects

```typescript
// Write
await setDoc(docRef, {
  ...data,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

// Read
const data = convertAllTimestamps(snapshot.data());
```

---

## Service Layer Patterns

### Validation at Service Boundaries

All service methods that accept user input must validate before delegating to repositories:

```typescript
async create(userId: string, payload: UserCreate): Promise<Result<User, AppError>> {
  const context = ErrorContextBuilder.fromService(
    this.context,
    'create',
    userId,
    projectId,     // if applicable
    { metadata }   // optional metadata
  );
  const contextString = ErrorContextBuilder.toString(context);

  // 1. Validate input
  const validation = validateWithSchema(userCreateSchema, payload, contextString);
  if (!validation.success) {
    return err(validation.error);
  }

  // 2. Delegate to repository (which handles sanitization)
  return await this.repository.create(userId, validation.value);
}
```

### Partial Updates

For partial updates, use `validatePartialWithSchema`:

```typescript
async update(userId: string, updates: UserUpdate): Promise<Result<User, AppError>> {
  const context = ErrorContextBuilder.fromService(this.context, 'update', userId);
  const contextString = ErrorContextBuilder.toString(context);

  // Validate partial input
  const validation = validatePartialWithSchema(userUpdateSchema, updates, contextString);
  if (!validation.success) {
    return err(validation.error);
  }

  return await this.repository.update(userId, validation.value);
}
```

---

## Hook Patterns

### LoadingState Usage

All hooks must use `LoadingState<T>` instead of separate boolean flags:

```typescript
import {
  LoadingState,
  loading,
  success,
  error as errorState,
  idle,
  getCurrentData,
} from '@/utils/loading-state';

const [state, setState] = useState<LoadingState<User | null>>(autoFetch ? loading() : idle());

// Access state
const user = state.status === 'success' ? state.data : null;
const isLoading = state.status === 'loading';
const error = state.status === 'error' ? state.error : null;
```

### State Reference Pattern

For optimistic updates, use a ref to track current state:

```typescript
const stateRef = useRef(state);

// Keep stateRef in sync with state
useEffect(() => {
  stateRef.current = state;
}, [state]);

// Use in callbacks
const currentData = stateRef.current.status === 'success' ? stateRef.current.data : null;
```

---

## Error Context Patterns

### Repository Error Context

For repositories, create context object and convert to string for `ErrorMapper.fromFirestore()`:

```typescript
const context = ErrorContextBuilder.fromRepository(
  this.context, // Repository class name
  'methodName', // Method name
  userId, // User ID if applicable
  projectId, // Project ID if applicable
  { metadata }, // Optional metadata
);
const contextString = ErrorContextBuilder.toString(context);

// Use with ErrorMapper
} catch (error) {
  return err(ErrorMapper.fromFirestore(error, contextString));
}
```

### Service Error Context

For services, create context object and convert to string for `ErrorMapper.from*()` functions:

```typescript
const context = ErrorContextBuilder.fromService(
  this.context, // Service class name
  'methodName', // Method name
  userId, // User ID if applicable
  projectId, // Project ID if applicable
  { metadata }, // Optional metadata
);
const contextString = ErrorContextBuilder.toString(context);

// Use with ErrorMapper
return err(ErrorMapper.fromFirestore(error, contextString));
```

### Hook Error Context

For hooks, pass context object directly to `handleError()` (accepts both string and object):

```typescript
const context = ErrorContextBuilder.fromHook(
  'useHookName', // Hook name
  'methodName', // Method name
  userId, // User ID if applicable
  projectId, // Project ID if applicable
  { metadata }, // Optional metadata
);

// Pass directly to handleError (no conversion needed)
handleError(result.error, context);
```

---

## Validation Patterns

### Service Layer Validation

Always validate at service boundaries using `validateWithSchema`:

```typescript
const validation = validateWithSchema(schema, data, contextString);
if (!validation.success) {
  return err(validation.error);
}
```

### Repository Defensive Parsing

Use `validateWithSchema` for defensive parsing of data FROM Firestore:

```typescript
const validationResult = validateWithSchema(schema, data, contextString);
if (!validationResult.success) {
  return err(validationResult.error);
}
return ok(validationResult.value);
```

---

## Sanitization Patterns

### Repository Sanitization

Sanitize all inputs in repositories before validation:

```typescript
async create(userId: string, payload: UserCreate): Promise<Result<User, AppError>> {
  const context = ErrorContextBuilder.fromRepository(this.context, 'create', userId);
  const contextString = ErrorContextBuilder.toString(context);

  try {
    // 1. Sanitize input (validation happens in service layer)
    const sanitized = this.sanitizeUserCreate(payload);

    // 2. Perform operation
    const docRef = await addDoc(collectionRef, {
      ...sanitized,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return await this.get(userId, docRef.id);
  } catch (error) {
    return err(ErrorMapper.fromFirestore(error, contextString));
  }
}
```

### Sanitization Helpers

Use centralized sanitization helpers:

- `sanitizeString()` - For string fields
- `sanitizeEmail()` - For email addresses
- `sanitizePhone()` - For phone numbers
- `sanitizePersonInfo()` - For person information objects
- `sanitizeUrl()` - For URLs
- `sanitizeContactInfo()` - For contact information objects

---

## Optimistic Updates Pattern

### Standard Pattern

For mutation hooks, implement optimistic updates with rollback:

```typescript
const updateItem = useCallback(
  async (updates: ItemUpdate): Promise<boolean> => {
    const currentData = stateRef.current.status === 'success' ? stateRef.current.data : null;
    if (!userId || !currentData) {
      return false;
    }

    // Optimistic update
    const optimisticValue = { ...currentData, ...updates } as Item;
    setState(success(optimisticValue));

    const result = await service.updateItem(userId, updates);

    if (!isMountedRef.current) return false;

    if (result.success) {
      // Refresh to get final state from server
      await fetchItem();
      return true;
    } else {
      // Rollback on error
      setState(success(currentData));
      handleError(result.error, ErrorContextBuilder.fromHook('useItem', 'updateItem', userId));
      onError?.(result.error);
      return false;
    }
  },
  [userId, service, handleError, onError, fetchItem],
);
```

### Key Points

1. **Capture current data** before optimistic update using `stateRef.current`
2. **Apply optimistic update** immediately with `setState(success(optimisticValue))`
3. **On success**: Refresh from server to get final state
4. **On error**: Rollback to previous state using captured `currentData`
5. **Always check** `isMountedRef.current` before updating state

### Delete Pattern

For delete operations, optimistically set to null:

```typescript
const deleteItem = useCallback(async (): Promise<boolean> => {
  const currentData = stateRef.current.status === 'success' ? stateRef.current.data : null;
  if (!userId || !currentData) {
    return false;
  }

  // Optimistic update - set to null immediately
  setState(success(null));

  const result = await service.deleteItem(userId);

  if (!isMountedRef.current) return false;

  if (result.success) {
    return true;
  } else {
    // Rollback on error
    setState(success(currentData));
    handleError(result.error, ErrorContextBuilder.fromHook('useItem', 'deleteItem', userId));
    onError?.(result.error);
    return false;
  }
}, [userId, service, handleError, onError]);
```

---

## Checklist

When creating or updating a module, ensure:

### Repository

- [ ] Sanitization methods follow naming pattern (`sanitize*Create`, `sanitize*Update`)
- [ ] All methods use `ErrorContextBuilder.fromRepository()` with proper userId/projectId
- [ ] All write operations sanitize before validation
- [ ] Defensive parsing with `validateWithSchema` in `parseSnapshot` methods
- [ ] Consistent error mapping using `ErrorMapper.fromFirestore()`
- [ ] Timestamp handling uses `serverTimestamp()` for writes, `convertAllTimestamps()` for reads

### Service

- [ ] All create/update methods validate with `validateWithSchema()` before repository calls
- [ ] Validation errors use consistent context strings
- [ ] Partial updates use `validatePartialWithSchema()`
- [ ] All methods use `ErrorContextBuilder.fromService()` with proper userId/projectId

### Hook

- [ ] Uses `LoadingState<T>` instead of separate boolean flags
- [ ] State management uses `loading()`, `success()`, `error()`, `idle()` helpers
- [ ] Error handling uses `errorState()` with previous data for rollback
- [ ] Optimistic updates use `getCurrentData()` or `stateRef.current` for rollback
- [ ] All mutation hooks have optimistic updates where appropriate
- [ ] Cleanup on unmount (check `isMountedRef.current`)

---

## References

- `src/utils/loading-state.ts` - LoadingState implementation
- `src/utils/validation-helpers.ts` - Validation utilities
- `src/utils/sanitization-helpers.ts` - Sanitization utilities
- `src/utils/error-context-builder.ts` - Error context builder
- `src/utils/error-mapper.ts` - Error mapping utilities
