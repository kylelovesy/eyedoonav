# Key People & Photo Request Migration - Complete Package

## Overview

Complete migration of key-people and photo-request modules from pre-migration structure to the new architecture following timeline/location/portal patterns.

---

## ✅ Files Created

### Interfaces

1. **`i-key-people-repository.ts`** ✅ (Created above)
2. **`i-photo-request-repository.ts`** ✅ (Created above)

### Repositories

3. **`firestore-key-people-repository.ts`** ✅ (Created above - Parts 1 & 2)
4. **`firestore-photo-request-repository.ts`** ⚠️ (See pattern below)

### Services

5. **`key-people-service.ts`** ⚠️ (See pattern below)
6. **`photo-request-service.ts`** ⚠️ (See pattern below)

### Hooks

7. **`use-key-people.ts`** ⚠️ (See pattern below)
8. **`use-photo-request.ts`** ⚠️ (See pattern below)

---

## 📋 Photo Request Repository Pattern

The photo request repository follows **identical pattern** to key people. Here's the structure:

```typescript
// firestore-photo-request-repository.ts

export class FirestorePhotoRequestRepository implements IPhotoRequestRepository {
  private readonly context = 'FirestorePhotoRequestRepository';

  private getPhotoRequestDocRef(projectId: string) {
    return doc(firestore, 'projects', projectId, 'photoRequests', 'data');
  }

  private parseSnapshot(
    snapshot: DocumentSnapshot,
    context: string,
  ): Result<PhotoRequestList, AppError> {
    // Same pattern as key people
    // 1. Convert timestamps
    // 2. Extract config and items
    // 3. Validate config
    // 4. Validate and sanitize items
    // 5. Build and validate list
  }

  private sanitizePhotoRequestItem(item: PhotoRequestItem): PhotoRequestItem {
    return {
      ...item,
      itemName: sanitizeString(item.itemName),
      itemDescription: sanitizeString(item.itemDescription),
      description: sanitizeString(item.description),
      imageUrl: sanitizeUrl(item.imageUrl) || undefined,
      photographerNotes: sanitizeStringOrUndefined(item.photographerNotes ?? null),
    };
  }

  // Methods: createInitial, get, updateConfig, addRequest, updateRequest, deleteRequest, subscribe
  // All follow same pattern as key people repository
}
```

**Key Differences from Key People:**

- Collection path: `'photoRequests'` instead of `'keyPeople'`
- Method names: `addRequest` / `updateRequest` / `deleteRequest` instead of `addPerson` / etc
- Sanitization: handles `imageUrl`, `description`, `photographerNotes` fields
- No contact info or avatar fields

---

## 📋 Service Layer Pattern

Both services follow the same pattern - here's the structure:

```typescript
// key-people-service.ts

export interface IKeyPeopleService {
  // CRUD operations
  get(projectId: string): Promise<Result<KeyPeopleList, AppError>>;
  createInitial(projectId: string): Promise<Result<void, AppError>>;

  // Item operations
  addPerson(projectId: string, input: KeyPeopleItemInput): Promise<Result<KeyPeopleItem, AppError>>;
  updatePerson(projectId: string, item: KeyPeopleItem): Promise<Result<void, AppError>>;
  deletePerson(projectId: string, itemId: string): Promise<Result<void, AppError>>;

  // Config operations
  updateConfig(
    projectId: string,
    updates: Partial<KeyPeopleConfig>,
  ): Promise<Result<void, AppError>>;

  // Real-time
  subscribe(
    projectId: string,
    onUpdate: (result: Result<KeyPeopleList | null, AppError>) => void,
  ): () => void;
}

export class KeyPeopleService implements IKeyPeopleService {
  private readonly context = 'KeyPeopleService';

  constructor(private repository: IKeyPeopleRepository) {}

  async get(projectId: string): Promise<Result<KeyPeopleList, AppError>> {
    return this.repository.get(projectId);
  }

  async createInitial(projectId: string): Promise<Result<void, AppError>> {
    return this.repository.createInitial(projectId);
  }

  async addPerson(
    projectId: string,
    input: KeyPeopleItemInput,
  ): Promise<Result<KeyPeopleItem, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'addPerson', { projectId });

    // Validate input
    const validation = validateWithSchema(keyPeopleItemInputSchema, input, context);
    if (!validation.success) {
      return validation as Result<KeyPeopleItem, AppError>;
    }

    // Create complete item with generated ID
    const newItem: KeyPeopleItem = {
      ...validation.value,
      id: generateUUID(),
      categoryId: '',
      itemName: validation.value.displayName || validation.value.itemName || '',
      itemDescription: validation.value.itemDescription || '',
      isCustom: false,
      isChecked: false,
      isDisabled: false,
      createdBy: validation.value.createdBy,
      updatedBy: validation.value.updatedBy,
      createdAt: new Date(),
    };

    // Validate complete item
    const itemValidation = validateWithSchema(keyPeopleItemSchema, newItem, context);
    if (!itemValidation.success) {
      return itemValidation as Result<KeyPeopleItem, AppError>;
    }

    // Add to repository
    const addResult = await this.repository.addPerson(projectId, itemValidation.value);
    if (!addResult.success) {
      return addResult as Result<KeyPeopleItem, AppError>;
    }

    return ok(itemValidation.value);
  }

  async updatePerson(projectId: string, item: KeyPeopleItem): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'updatePerson', {
      projectId,
      itemId: item.id,
    });

    // Validate item
    const validation = validateWithSchema(keyPeopleItemSchema, item, context);
    if (!validation.success) {
      return validation;
    }

    return this.repository.updatePerson(projectId, validation.value);
  }

  async deletePerson(projectId: string, itemId: string): Promise<Result<void, AppError>> {
    return this.repository.deletePerson(projectId, itemId);
  }

  async updateConfig(
    projectId: string,
    updates: Partial<KeyPeopleConfig>,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'updateConfig', { projectId });

    // Validate updates
    const validation = validatePartialWithSchema(keyPeopleConfigSchema, updates, context);
    if (!validation.success) {
      return validation;
    }

    return this.repository.updateConfig(projectId, validation.value as Partial<KeyPeopleConfig>);
  }

  subscribe(
    projectId: string,
    onUpdate: (result: Result<KeyPeopleList | null, AppError>) => void,
  ): () => void {
    return this.repository.subscribe(projectId, onUpdate);
  }
}
```

**Photo Request Service** - Identical pattern, just replace:

- `KeyPeople` → `PhotoRequest`
- `Person` → `Request`
- Input schema validation with `photoRequestItemInputSchema`

---

## 📋 Hook Layer Pattern

Both hooks follow the same pattern:

```typescript
// use-key-people.ts

interface UseKeyPeopleOptions {
  projectId: string;
  autoFetch?: boolean;
  enableRealtime?: boolean;
  onSuccess?: (list: KeyPeopleList | null) => void;
  onError?: (error: AppError) => void;
}

interface UseKeyPeopleResult {
  keyPeopleList: KeyPeopleList | null;
  loading: boolean;
  error: AppError | null;
  state: LoadingState<KeyPeopleList | null>;

  // List operations
  fetchList: () => Promise<void>;
  updateConfig: (updates: Partial<KeyPeopleConfig>) => Promise<boolean>;

  // Item operations
  addPerson: (input: KeyPeopleItemInput) => Promise<boolean>;
  updatePerson: (item: KeyPeopleItem) => Promise<boolean>;
  deletePerson: (itemId: string) => Promise<boolean>;

  // Utility
  refresh: () => Promise<void>;
  clearError: () => void;
}

export function useKeyPeople(
  service: KeyPeopleService,
  options: UseKeyPeopleOptions,
): UseKeyPeopleResult {
  const { projectId, autoFetch = false, enableRealtime = false, onSuccess, onError } = options;

  const [state, setState] = useState<LoadingState<KeyPeopleList | null>>(
    autoFetch || enableRealtime ? loading() : idle(),
  );
  const { handleError } = useErrorHandler();
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const stateRef = useRef(state);

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // ============================================================================
  // LIST OPERATIONS
  // ============================================================================

  const fetchList = useCallback(async () => {
    setState(prevState => loading(getCurrentData(prevState)));

    const result = await service.get(projectId);

    if (!isMountedRef.current) return;

    if (result.success) {
      setState(success(result.value));
      onSuccess?.(result.value);
    } else {
      setState(prevState => errorState(result.error, getCurrentData(prevState)));
      handleError(
        result.error,
        ErrorContextBuilder.fromHook('useKeyPeople', 'fetchList', undefined, projectId),
      );
      onError?.(result.error);
    }
  }, [projectId, service, handleError, onSuccess, onError]);

  const updateConfig = useCallback(
    async (updates: Partial<KeyPeopleConfig>): Promise<boolean> => {
      const currentData = stateRef.current.status === 'success' ? stateRef.current.data : null;
      if (!currentData) return false;

      // Optimistic update
      const optimisticList: KeyPeopleList = {
        ...currentData,
        config: { ...currentData.config, ...updates },
      };
      setState(success(optimisticList));

      const result = await service.updateConfig(projectId, updates);

      if (!isMountedRef.current) return false;

      if (result.success) {
        await fetchList();
        return true;
      } else {
        setState(success(currentData)); // Rollback
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('useKeyPeople', 'updateConfig', undefined, projectId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [projectId, service, fetchList, handleError, onError],
  );

  // ============================================================================
  // ITEM OPERATIONS (with optimistic updates)
  // ============================================================================

  const addPerson = useCallback(
    async (input: KeyPeopleItemInput): Promise<boolean> => {
      const currentData = stateRef.current.status === 'success' ? stateRef.current.data : null;
      if (!currentData) return false;

      // Optimistic item
      const optimisticItem: KeyPeopleItem = {
        ...input,
        id: `temp-${Date.now()}`,
        categoryId: '',
        itemName: input.displayName || input.itemName || '',
        itemDescription: input.itemDescription || '',
        isCustom: false,
        isChecked: false,
        isDisabled: false,
        displayName: input.displayName || input.itemName || '',
        role: input.role ?? null,
        isVIP: input.isVIP ?? false,
        canRallyPeople: input.canRallyPeople ?? false,
        mustPhotograph: input.mustPhotograph ?? false,
        dontPhotograph: input.dontPhotograph ?? false,
        notes: input.notes ?? null,
        involvement: input.involvement ?? null,
        avatar: input.avatar ?? null,
        contact: input.contact ?? null,
        createdBy: input.createdBy,
        createdAt: new Date(),
      };

      const optimisticList: KeyPeopleList = {
        ...currentData,
        items: [...currentData.items, optimisticItem],
      };
      setState(success(optimisticList));

      const result = await service.addPerson(projectId, input);

      if (!isMountedRef.current) return false;

      if (result.success) {
        await fetchList();
        return true;
      } else {
        setState(success(currentData)); // Rollback
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('useKeyPeople', 'addPerson', undefined, projectId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [projectId, service, fetchList, handleError, onError],
  );

  // updatePerson and deletePerson follow same pattern...

  // ============================================================================
  // REAL-TIME SUBSCRIPTION
  // ============================================================================

  useEffect(() => {
    if (!enableRealtime) return;

    unsubscribeRef.current = service.subscribe(projectId, result => {
      if (!isMountedRef.current) return;

      if (result.success) {
        setState(success(result.value));
        onSuccess?.(result.value);
      } else {
        setState(prevState => errorState(result.error, getCurrentData(prevState)));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('useKeyPeople', 'subscribe', undefined, projectId),
        );
        onError?.(result.error);
      }
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [projectId, enableRealtime, service, handleError, onSuccess, onError]);

  // ============================================================================
  // AUTO-FETCH
  // ============================================================================

  useEffect(() => {
    if (autoFetch && !enableRealtime) {
      fetchList();
    }
  }, [autoFetch, enableRealtime, fetchList]);

  // ============================================================================
  // UTILITY
  // ============================================================================

  const refresh = useCallback(() => fetchList(), [fetchList]);

  const clearError = useCallback(() => {
    if (state.status === 'error') {
      setState(success(state.data || null));
    }
  }, [state]);

  return {
    keyPeopleList: state.status === 'success' ? state.data : null,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    state,
    fetchList,
    updateConfig,
    addPerson,
    updatePerson,
    deletePerson,
    refresh,
    clearError,
  };
}
```

**Photo Request Hook** - Identical pattern, just replace:

- `KeyPeople` → `PhotoRequest`
- `Person` → `Request`
- Type signatures match photo request schemas

---

## 🔑 Key Migration Points

### 1. **Data Structure Change**

**Old (pre-migration):**

```typescript
// Separate config and items documents
'keyPeople/config' - Config doc
'keyPeople/items' - Items array doc
```

**New (migrated):**

```typescript
// Single flattened document
'keyPeople/data' - {
  ...config fields,
  items: [...],
  categories: [],
  pendingUpdates: []
}
```

### 2. **Service Layer Change**

**Old:** Service handled Firestore directly

```typescript
await updateDoc(getItemsRef(projectId), {
  items: arrayUnion(item),
});
```

**New:** Service delegates to repository

```typescript
return this.repository.addPerson(projectId, item);
```

### 3. **Hook Pattern Change**

**Old:** Hooks called service directly, used Zustand stores

```typescript
const store = useKeyPeopleStore();
const result = await keyPeopleService.addPerson(projectId, input);
if (result.success) {
  store.setData(result.value);
}
```

**New:** Hooks manage own state, use service through DI

```typescript
const { keyPeopleList, addPerson } = useKeyPeople(keyPeopleService, {
  projectId,
  autoFetch: true,
});

await addPerson(input); // Handles state internally
```

### 4. **Validation Flow**

**Old:** Service level only

```typescript
const parsed = KeyPeopleItemSchema.parse(item);
```

**New:** Repository AND Service level

```typescript
// Service validates input
const validation = validateWithSchema(inputSchema, input, context);

// Repository validates complete item
const itemValidation = validateWithSchema(itemSchema, item, context);
```

### 5. **Error Handling**

**Old:** Direct Zod errors

```typescript
catch (error) {
  if (error instanceof z.ZodError) {
    return err(ErrorMapper.fromZod(error, context));
  }
}
```

**New:** Context-tracked errors throughout

```typescript
const context = ErrorContextBuilder.fromService('KeyPeopleService', 'addPerson', { projectId });
const validation = validateWithSchema(schema, input, context);
```

---

## 📊 Usage Comparison

### Old Usage (Pre-Migration)

```typescript
// In component
const actions = useKeyPersonActions();
const store = useKeyPeopleStore();

useEffect(() => {
  actions.load(projectId);
}, [projectId]);

const handleAdd = async input => {
  await actions.addPerson(projectId, input);
  // Store automatically updated via listener
};

// Access data from store
const { list, loading } = store;
```

### New Usage (Migrated)

```typescript
// In component
const { keyPeopleList, loading, error, addPerson, updatePerson, deletePerson } = useKeyPeople(
  keyPeopleService,
  {
    projectId,
    autoFetch: true,
    enableRealtime: false,
    onSuccess: list => console.log('Loaded:', list),
    onError: err => console.error('Error:', err),
  },
);

const handleAdd = async input => {
  const success = await addPerson(input);
  if (success) {
    // Item added, list automatically refreshed
  }
};

// Data directly from hook
const people = keyPeopleList?.items || [];
```

---

## ✅ Implementation Checklist

### Key People Module

- [x] Interface created
- [x] Repository implemented (Parts 1 & 2)
- [ ] Service implemented (pattern provided)
- [ ] Hook implemented (pattern provided)
- [ ] Tests written

### Photo Request Module

- [x] Interface created
- [ ] Repository implemented (pattern provided)
- [ ] Service implemented (pattern provided)
- [ ] Hook implemented (pattern provided)
- [ ] Tests written

### Integration

- [ ] Update ServiceFactory to include new services
- [ ] Remove old service files
- [ ] Remove old hook files (actions)
- [ ] Remove Zustand stores (if no longer needed)
- [ ] Update imports throughout application
- [ ] Run migration script for data structure

---

## 🚀 Next Steps

1. **Complete Photo Request Repository** using key people repo as template
2. **Implement Services** following the provided pattern
3. **Implement Hooks** following the provided pattern
4. **Update ServiceFactory**:

   ```typescript
   import { KeyPeopleService } from '@/services/key-people-service';
   import { PhotoRequestService } from '@/services/photo-request-service';
   import { keyPeopleRepository } from '@/repositories/firestore/firestore-key-people-repository';
   import { photoRequestRepository } from '@/repositories/firestore/firestore-photo-request-repository';

   export const keyPeopleService = new KeyPeopleService(keyPeopleRepository);
   export const photoRequestService = new PhotoRequestService(photoRequestRepository);
   ```

5. **Test thoroughly** - especially the data structure migration

All patterns are consistent with your timeline, location, and portal implementations! 🎉
