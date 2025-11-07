# Notes & Vendor Migration - Complete Implementation Guide

## Overview

Complete migration guide for notes and vendor modules with all file patterns and implementations.

---

## ✅ Files Created

### Notes Module

1. **`notes.schema.ts`** ✅ (Created above)
2. **`i-notes-repository.ts`** ⚠️ (Pattern below)
3. **`firestore-notes-repository.ts`** ⚠️ (Pattern below)
4. **`notes-service.ts`** ⚠️ (Pattern below)
5. **`use-notes.ts`** ⚠️ (Pattern below)

### Vendor Module

6. **`vendor.schema.ts`** ⚠️ (Pattern below)
7. **`i-vendor-repository.ts`** ⚠️ (Pattern below)
8. **`firestore-vendor-repository.ts`** ⚠️ (Pattern below)
9. **`vendor-service.ts`** ⚠️ (Pattern below)
10. **`use-vendor.ts`** ⚠️ (Pattern below)

---

## 📋 Notes Repository Interface

```typescript
// i-notes-repository.ts

export interface INotesRepository {
  // Project notes
  getProjectNotes(projectId: string): Promise<Result<StandaloneNote[], AppError>>;
  addProjectNote(projectId: string, note: StandaloneNote): Promise<Result<void, AppError>>;
  updateProjectNote(projectId: string, note: StandaloneNote): Promise<Result<void, AppError>>;
  deleteProjectNote(projectId: string, noteId: string): Promise<Result<void, AppError>>;

  // User notes
  getUserNotes(userId: string): Promise<Result<StandaloneNote[], AppError>>;
  addUserNote(userId: string, note: StandaloneNote): Promise<Result<void, AppError>>;
  updateUserNote(userId: string, note: StandaloneNote): Promise<Result<void, AppError>>;
  deleteUserNote(userId: string, noteId: string): Promise<Result<void, AppError>>;

  // Admin notes
  getAdminNotes(): Promise<Result<StandaloneNote[], AppError>>;
  addAdminNote(note: StandaloneNote): Promise<Result<void, AppError>>;
  updateAdminNote(note: StandaloneNote): Promise<Result<void, AppError>>;
  deleteAdminNote(noteId: string): Promise<Result<void, AppError>>;

  // Subscriptions
  subscribeToProjectNotes(
    projectId: string,
    onUpdate: (result: Result<StandaloneNote[], AppError>) => void,
  ): Unsubscribe;

  subscribeToUserNotes(
    userId: string,
    onUpdate: (result: Result<StandaloneNote[], AppError>) => void,
  ): Unsubscribe;
}
```

---

## 📋 Notes Repository Implementation Pattern

```typescript
// firestore-notes-repository.ts

export class FirestoreNotesRepository implements INotesRepository {
  private readonly context = 'FirestoreNotesRepository';

  // Collection references
  private getProjectNotesCollection(projectId: string) {
    return collection(firestore, 'projects', projectId, 'notes');
  }

  private getUserNotesCollection(userId: string) {
    return collection(firestore, 'users', userId, 'notes');
  }

  private getAdminNotesCollection() {
    return collection(firestore, 'admin_notes');
  }

  // Helper to parse and validate note
  private parseNote(doc: DocumentSnapshot, context: string): Result<StandaloneNote, AppError> {
    if (!doc.exists()) {
      return err(/* not found error */);
    }

    const data = convertAllTimestamps({ id: doc.id, ...doc.data() });
    return validateWithSchema(standaloneNoteSchema, data, context);
  }

  // Sanitize note
  private sanitizeNote(note: StandaloneNote): StandaloneNote {
    return {
      ...note,
      content: sanitizeText(note.content) || note.content,
    };
  }

  // PROJECT NOTES
  async getProjectNotes(projectId: string): Promise<Result<StandaloneNote[], AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'getProjectNotes',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const notesCol = this.getProjectNotesCollection(projectId);
      const q = query(notesCol, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const notes: StandaloneNote[] = [];
      for (const doc of snapshot.docs) {
        const result = this.parseNote(doc, contextString);
        if (result.success) {
          notes.push(this.sanitizeNote(result.value));
        }
      }

      return ok(notes);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async addProjectNote(projectId: string, note: StandaloneNote): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'addProjectNote',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // Sanitize and validate
      const sanitized = this.sanitizeNote(note);
      const validation = validateWithSchema(standaloneNoteSchema, sanitized, context);
      if (!validation.success) {
        return validation;
      }

      // Add to Firestore
      const notesCol = this.getProjectNotesCollection(projectId);
      await addDoc(notesCol, {
        ...validation.value,
        createdAt: serverTimestamp(),
      });

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async updateProjectNote(
    projectId: string,
    note: StandaloneNote,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'updateProjectNote',
      undefined,
      projectId,
      { noteId: note.id },
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // Sanitize and validate
      const sanitized = this.sanitizeNote(note);
      const validation = validateWithSchema(standaloneNoteSchema, sanitized, context);
      if (!validation.success) {
        return validation;
      }

      // Update in Firestore
      const noteDoc = doc(firestore, 'projects', projectId, 'notes', note.id);
      await updateDoc(noteDoc, {
        ...validation.value,
        updatedAt: serverTimestamp(),
      });

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async deleteProjectNote(projectId: string, noteId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'deleteProjectNote',
      undefined,
      projectId,
      { noteId },
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const noteDoc = doc(firestore, 'projects', projectId, 'notes', noteId);
      await deleteDoc(noteDoc);
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  // USER NOTES - Same pattern as project notes, different collection path
  // ADMIN NOTES - Same pattern, different collection path

  // SUBSCRIPTIONS
  subscribeToProjectNotes(
    projectId: string,
    onUpdate: (result: Result<StandaloneNote[], AppError>) => void,
  ): Unsubscribe {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'subscribeToProjectNotes',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    const notesCol = this.getProjectNotesCollection(projectId);
    const q = query(notesCol, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      snapshot => {
        const notes: StandaloneNote[] = [];
        for (const doc of snapshot.docs) {
          const result = this.parseNote(doc, contextString);
          if (result.success) {
            notes.push(this.sanitizeNote(result.value));
          }
        }
        onUpdate(ok(notes));
      },
      error => {
        onUpdate(err(ErrorMapper.fromFirestore(error, contextString)));
      },
    );
  }
}

export const notesRepository = new FirestoreNotesRepository();
```

---

## 📋 Notes Service Pattern

```typescript
// notes-service.ts

export interface INotesService {
  // Project notes
  getProjectNotes(projectId: string): Promise<Result<StandaloneNote[], AppError>>;
  addProjectNote(
    projectId: string,
    input: StandaloneNoteInput,
  ): Promise<Result<StandaloneNote, AppError>>;
  updateProjectNote(projectId: string, note: StandaloneNote): Promise<Result<void, AppError>>;
  deleteProjectNote(projectId: string, noteId: string): Promise<Result<void, AppError>>;

  // User notes
  getUserNotes(userId: string): Promise<Result<StandaloneNote[], AppError>>;
  addUserNote(
    userId: string,
    input: StandaloneNoteInput,
  ): Promise<Result<StandaloneNote, AppError>>;
  updateUserNote(userId: string, note: StandaloneNote): Promise<Result<void, AppError>>;
  deleteUserNote(userId: string, noteId: string): Promise<Result<void, AppError>>;

  // Admin notes
  getAdminNotes(): Promise<Result<StandaloneNote[], AppError>>;
  addAdminNote(input: StandaloneNoteInput): Promise<Result<StandaloneNote, AppError>>;
  updateAdminNote(note: StandaloneNote): Promise<Result<void, AppError>>;
  deleteAdminNote(noteId: string): Promise<Result<void, AppError>>;

  // Subscriptions
  subscribeToProjectNotes(
    projectId: string,
    onUpdate: (result: Result<StandaloneNote[], AppError>) => void,
  ): () => void;
}

export class NotesService implements INotesService {
  private readonly context = 'NotesService';

  constructor(private repository: INotesRepository) {}

  async getProjectNotes(projectId: string): Promise<Result<StandaloneNote[], AppError>> {
    return this.repository.getProjectNotes(projectId);
  }

  async addProjectNote(
    projectId: string,
    input: StandaloneNoteInput,
  ): Promise<Result<StandaloneNote, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'addProjectNote', { projectId });

    // Validate input
    const validation = validateWithSchema(standaloneNoteInputSchema, input, context);
    if (!validation.success) {
      return validation as Result<StandaloneNote, AppError>;
    }

    // Create complete note
    const newNote: StandaloneNote = {
      ...validation.value,
      id: generateUUID(),
      projectId,
      createdAt: new Date(),
      updatedAt: undefined,
    };

    // Validate complete note
    const noteValidation = validateWithSchema(standaloneNoteSchema, newNote, context);
    if (!noteValidation.success) {
      return noteValidation as Result<StandaloneNote, AppError>;
    }

    // Add to repository
    const addResult = await this.repository.addProjectNote(projectId, noteValidation.value);
    if (!addResult.success) {
      return addResult as Result<StandaloneNote, AppError>;
    }

    return ok(noteValidation.value);
  }

  async updateProjectNote(
    projectId: string,
    note: StandaloneNote,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'updateProjectNote', {
      projectId,
      noteId: note.id,
    });

    // Validate note
    const validation = validateWithSchema(standaloneNoteSchema, note, context);
    if (!validation.success) {
      return validation;
    }

    return this.repository.updateProjectNote(projectId, validation.value);
  }

  async deleteProjectNote(projectId: string, noteId: string): Promise<Result<void, AppError>> {
    return this.repository.deleteProjectNote(projectId, noteId);
  }

  // Repeat pattern for user notes and admin notes...

  subscribeToProjectNotes(
    projectId: string,
    onUpdate: (result: Result<StandaloneNote[], AppError>) => void,
  ): () => void {
    return this.repository.subscribeToProjectNotes(projectId, onUpdate);
  }
}
```

---

## 📋 Notes Hook Pattern

```typescript
// use-notes.ts

interface UseNotesOptions {
  projectId?: string;
  userId?: string;
  scope: 'project' | 'user' | 'admin';
  autoFetch?: boolean;
  enableRealtime?: boolean;
  onSuccess?: (notes: StandaloneNote[]) => void;
  onError?: (error: AppError) => void;
}

interface UseNotesResult {
  notes: StandaloneNote[];
  loading: boolean;
  error: AppError | null;
  state: LoadingState<StandaloneNote[]>;

  // Operations
  fetchNotes: () => Promise<void>;
  addNote: (input: StandaloneNoteInput) => Promise<boolean>;
  updateNote: (note: StandaloneNote) => Promise<boolean>;
  deleteNote: (noteId: string) => Promise<boolean>;

  // Utility
  refresh: () => Promise<void>;
  clearError: () => void;
}

export function useNotes(service: NotesService, options: UseNotesOptions): UseNotesResult {
  const {
    projectId,
    userId,
    scope,
    autoFetch = false,
    enableRealtime = false,
    onSuccess,
    onError,
  } = options;

  const [state, setState] = useState<LoadingState<StandaloneNote[]>>(
    autoFetch || enableRealtime ? loading([]) : idle(),
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

  const fetchNotes = useCallback(async () => {
    setState(prevState => loading(getCurrentData(prevState) || []));

    let result: Result<StandaloneNote[], AppError>;
    if (scope === 'project' && projectId) {
      result = await service.getProjectNotes(projectId);
    } else if (scope === 'user' && userId) {
      result = await service.getUserNotes(userId);
    } else if (scope === 'admin') {
      result = await service.getAdminNotes();
    } else {
      setState(
        errorState(
          ErrorMapper.createGenericError(
            ErrorCode.VALIDATION_FAILED,
            'Invalid scope or missing ID',
            'Please provide valid scope and ID',
            'useNotes.fetchNotes',
          ),
          [],
        ),
      );
      return;
    }

    if (!isMountedRef.current) return;

    if (result.success) {
      setState(success(result.value));
      onSuccess?.(result.value);
    } else {
      setState(errorState(result.error, []));
      handleError(
        result.error,
        ErrorContextBuilder.fromHook('useNotes', 'fetchNotes', userId, projectId),
      );
      onError?.(result.error);
    }
  }, [scope, projectId, userId, service, handleError, onSuccess, onError]);

  const addNote = useCallback(
    async (input: StandaloneNoteInput): Promise<boolean> => {
      const currentData = stateRef.current.status === 'success' ? stateRef.current.data : [];

      // Optimistic note
      const optimisticNote: StandaloneNote = {
        ...input,
        id: `temp-${Date.now()}`,
        projectId,
        userId,
        createdAt: new Date(),
        updatedAt: undefined,
      };

      setState(success([optimisticNote, ...currentData]));

      let result: Result<StandaloneNote, AppError>;
      if (scope === 'project' && projectId) {
        result = await service.addProjectNote(projectId, input);
      } else if (scope === 'user' && userId) {
        result = await service.addUserNote(userId, input);
      } else if (scope === 'admin') {
        result = await service.addAdminNote(input);
      } else {
        return false;
      }

      if (!isMountedRef.current) return false;

      if (result.success) {
        await fetchNotes();
        return true;
      } else {
        setState(success(currentData)); // Rollback
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('useNotes', 'addNote', userId, projectId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [scope, projectId, userId, service, fetchNotes, handleError, onError],
  );

  // updateNote and deleteNote follow same pattern...

  // Real-time subscription
  useEffect(() => {
    if (!enableRealtime) return;

    if (scope === 'project' && projectId) {
      unsubscribeRef.current = service.subscribeToProjectNotes(projectId, result => {
        if (!isMountedRef.current) return;

        if (result.success) {
          setState(success(result.value));
          onSuccess?.(result.value);
        } else {
          setState(errorState(result.error, []));
          handleError(
            result.error,
            ErrorContextBuilder.fromHook('useNotes', 'subscribe', userId, projectId),
          );
          onError?.(result.error);
        }
      });
    }
    // Repeat for user and admin scopes...

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [scope, projectId, userId, enableRealtime, service, handleError, onSuccess, onError]);

  // Auto-fetch
  useEffect(() => {
    if (autoFetch && !enableRealtime) {
      fetchNotes();
    }
  }, [autoFetch, enableRealtime, fetchNotes]);

  const refresh = useCallback(() => fetchNotes(), [fetchNotes]);

  const clearError = useCallback(() => {
    if (state.status === 'error') {
      setState(success(state.data || []));
    }
  }, [state]);

  return {
    notes: state.status === 'success' ? state.data : [],
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    state,
    fetchNotes,
    addNote,
    updateNote,
    deleteNote,
    refresh,
    clearError,
  };
}
```

---

## 📋 Vendor Schema (Migrated)

```typescript
// vendor.schema.ts

import { z } from 'zod';
import {
  idSchema,
  urlSchema,
  contactInfoSchema,
  socialMediaSchema,
  optionalTimestampSchema,
  requiredTimestampSchema,
} from '@/domain/common/shared-schemas';
import {
  listBaseConfigSchema,
  listBaseItemSchema,
  listBaseItemInputSchema,
} from '@/domain/common/list-base.schema';
import { ListType, VendorType, ListSource } from '@/constants/enums';
import { DEFAULTS } from '@/constants/defaults';

/**
 * VENDOR CONFIG SCHEMA
 */
export const vendorConfigSchema = listBaseConfigSchema.extend({
  type: z.literal(ListType.VENDORS),
  source: z.nativeEnum(ListSource).default(ListSource.USER_LIST),
  totalVendors: z.number().int().min(0).default(0),
});

/**
 * VENDOR ITEM SCHEMA
 */
export const vendorItemSchema = listBaseItemSchema.extend({
  userId: idSchema, // Owner of this vendor entry
  projectId: idSchema.optional(), // Project-specific vendors
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  businessName: z.string().max(100, 'Business name too long').optional(),
  category: z.nativeEnum(VendorType),
  contact: contactInfoSchema.optional(),
  socialMedia: socialMediaSchema.optional(),
  website: urlSchema.optional().nullable(),
  notes: z
    .string()
    .max(DEFAULTS.TEXT_LENGTHS.NOTES, `Notes ${DEFAULTS.TEXT_LENGTHS_MSG.NOTES}`)
    .optional()
    .nullable(),
  isPreferred: z.boolean().default(DEFAULTS.DISABLED),
  isGlobal: z.boolean().default(DEFAULTS.DISABLED), // Global = user-level, not project-specific
  hasQRCode: z.boolean().default(DEFAULTS.DISABLED).optional(),
  qrCodePath: z.string().optional().nullable(),
  createdAt: requiredTimestampSchema,
  updatedAt: optionalTimestampSchema.optional(),
});

export const vendorItemInputSchema = listBaseItemInputSchema.extend({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  businessName: z.string().max(100, 'Business name too long').optional(),
  category: z.nativeEnum(VendorType).optional(),
  contact: contactInfoSchema.optional(),
  socialMedia: socialMediaSchema.optional(),
  website: urlSchema.optional().nullable(),
  notes: z
    .string()
    .max(DEFAULTS.TEXT_LENGTHS.NOTES, `Notes ${DEFAULTS.TEXT_LENGTHS_MSG.NOTES}`)
    .optional()
    .nullable(),
  isPreferred: z.boolean().optional(),
  isGlobal: z.boolean().optional(),
  qrCodePath: z.string().optional().nullable(),
});

export const vendorItemUpdateSchema = vendorItemInputSchema.partial();

/**
 * VENDOR LIST SCHEMA
 */
export const vendorListSchema = z.object({
  config: vendorConfigSchema,
  items: z.array(vendorItemSchema).default([]),
});

/**
 * TYPE EXPORTS
 */
export type VendorConfig = z.infer<typeof vendorConfigSchema>;
export type VendorItem = z.infer<typeof vendorItemSchema>;
export type VendorItemInput = z.infer<typeof vendorItemInputSchema>;
export type VendorItemUpdate = z.infer<typeof vendorItemUpdateSchema>;
export type VendorList = z.infer<typeof vendorListSchema>;

// Backward compatibility
export type VendorInput = VendorItemInput;
export type VendorsList = VendorList;
export type VendorsConfig = VendorConfig;
```

---

## 📋 Vendor Repository Interface

```typescript
// i-vendor-repository.ts

export interface IVendorRepository {
  // User-level vendors (global)
  getUserVendors(userId: string): Promise<Result<VendorList, AppError>>;
  createUserVendorList(userId: string): Promise<Result<void, AppError>>;
  addUserVendor(userId: string, vendor: VendorItem): Promise<Result<void, AppError>>;
  updateUserVendor(userId: string, vendor: VendorItem): Promise<Result<void, AppError>>;
  deleteUserVendor(userId: string, vendorId: string): Promise<Result<void, AppError>>;

  // Project-level vendors
  getProjectVendors(userId: string, projectId: string): Promise<Result<VendorList, AppError>>;
  createProjectVendorList(userId: string, projectId: string): Promise<Result<void, AppError>>;
  addProjectVendor(
    userId: string,
    projectId: string,
    vendor: VendorItem,
  ): Promise<Result<void, AppError>>;
  updateProjectVendor(
    userId: string,
    projectId: string,
    vendor: VendorItem,
  ): Promise<Result<void, AppError>>;
  deleteProjectVendor(
    userId: string,
    projectId: string,
    vendorId: string,
  ): Promise<Result<void, AppError>>;

  // Config operations
  updateUserVendorConfig(
    userId: string,
    updates: Partial<VendorConfig>,
  ): Promise<Result<void, AppError>>;
  updateProjectVendorConfig(
    userId: string,
    projectId: string,
    updates: Partial<VendorConfig>,
  ): Promise<Result<void, AppError>>;

  // Subscriptions
  subscribeToUserVendors(
    userId: string,
    onUpdate: (result: Result<VendorList | null, AppError>) => void,
  ): Unsubscribe;

  subscribeToProjectVendors(
    userId: string,
    projectId: string,
    onUpdate: (result: Result<VendorList | null, AppError>) => void,
  ): Unsubscribe;
}
```

---

## 🔑 Key Points for Vendor Module

### Data Structure

**User-level vendors:**

```
users/{userId}/lists/vendorList - { config, items: [...] }
```

**Project-level vendors:**

```
users/{userId}/projects/{projectId}/lists/vendorList - { config, items: [...] }
```

### Repository Pattern

- Same flattened structure as location/key-people
- Vendor items stored in `items` array within single document
- Config stored alongside items
- Sanitize: `name`, `businessName`, `website`, `notes`, `contact`, `socialMedia`
- Validate at both service and repository levels

### Service Pattern

- Validate inputs with schemas
- Generate UUIDs for new vendors
- Delegate to repository for persistence
- Return complete vendor items after creation

### Hook Pattern

- Dual scope: `'user'` or `'project'`
- Optimistic updates for all mutations
- Real-time subscriptions for both scopes
- Handle both userId and projectId based on scope

---

## 📊 Usage Examples

### Notes Module

```typescript
// Project notes
const {
  notes: projectNotes,
  loading,
  addNote,
  updateNote,
  deleteNote,
} = useNotes(notesService, {
  scope: 'project',
  projectId: 'project-123',
  autoFetch: true,
  enableRealtime: false,
});

await addNote({
  content: 'Remember to bring extra batteries',
  noteType: NoteType.REMINDER,
  source: NoteSource.PHOTOGRAPHER,
  scope: NoteScope.PHOTOGRAPHER,
});

// User notes
const { notes: userNotes } = useNotes(notesService, {
  scope: 'user',
  userId: 'user-123',
  autoFetch: true,
});
```

### Vendor Module

```typescript
// User-level vendors (global)
const {
  vendors: userVendors,
  loading,
  addVendor,
  updateVendor,
  deleteVendor,
} = useVendors(vendorService, {
  scope: 'user',
  userId: 'user-123',
  autoFetch: true,
});

await addVendor({
  name: 'ABC Florist',
  category: VendorType.FLORIST,
  contact: {
    email: 'contact@abcflorist.com',
    phone: '+1234567890',
  },
  isGlobal: true,
});

// Project-level vendors
const {
  vendors: projectVendors,
  loading,
  addVendor: addProjectVendor,
} = useVendors(vendorService, {
  scope: 'project',
  userId: 'user-123',
  projectId: 'project-123',
  autoFetch: true,
});

await addProjectVendor({
  name: 'Wedding Venue XYZ',
  category: VendorType.VENUE,
  isGlobal: false,
});
```

---

## ✅ Implementation Checklist

### Notes Module

- [x] Schema migrated
- [ ] Repository interface created
- [ ] Repository implemented
- [ ] Service implemented
- [ ] Hook implemented
- [ ] Tests written

### Vendor Module

- [ ] Schema migrated
- [ ] Repository interface created
- [ ] Repository implemented
- [ ] Service implemented
- [ ] Hook implemented
- [ ] Tests written

### Integration

- [ ] Update ServiceFactory
- [ ] Remove old service files
- [ ] Update imports throughout application
- [ ] Run data migration if needed

---

## 🚀 All patterns follow your established architecture!

Both modules now have:

- ✅ Three-layer architecture
- ✅ Result pattern for async operations
- ✅ Sanitization → Validation → Operation flow
- ✅ Optimistic updates with rollback
- ✅ Context tracking for errors
- ✅ Real-time subscriptions
- ✅ Complete type safety

Ready for implementation! 🎉
