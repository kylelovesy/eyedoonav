# Schema Refactoring Guide

## Overview

All schemas have been refactored to follow the pattern established in `user.schema.ts`:

- **Flat structure** instead of nested objects
- **Consistent timestamps** (`createdAt`, `updatedAt`) instead of nested metadata
- **Clear Input/Update/Create schemas** with proper field omissions
- **Type-safe defaults** using factory functions

---

## Key Changes

### 1. **Flattened Metadata**

#### Before:

```typescript
metadata: {
  totalCategories: 5,
  totalItems: 20,
  lastModified: Date,
  lastModifiedBy: 'user123'
}
```

#### After:

```typescript
totalCategories: 5,
totalItems: 20,
createdBy: 'user123',
lastModifiedBy: 'user123',
createdAt: Date,
updatedAt: Date
```

### 2. **Consistent Schema Patterns**

All schemas now follow this pattern:

```typescript
// Base schema
export const entitySchema = z.object({
  id: idSchema,
  // ... fields
  createdAt: requiredTimestampSchema,
  updatedAt: optionalTimestampSchema.optional(),
});

// Input schema (for create/update validation)
export const entityInputSchema = entitySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  // ... other system fields
});

// Update schema (all fields optional)
export const entityUpdateSchema = entityInputSchema.partial();

// Create schema (adds required system fields)
export const entityCreateSchema = entityInputSchema.extend({
  // Add any required creation fields
});
```

### 3. **Removed Nested Objects**

#### Project Schema - Before:

```typescript
projectInfo: {
  projectName: string;
  personA: { firstName: string; lastName: string };
  personB: { firstName: string; lastName: string };
  contact: { email: string; phone?: string };
}
```

#### Project Schema - After:

```typescript
projectName: string;
personAFirstName: string;
personALastName: string;
personBFirstName: string;
personBLastName: string;
contactEmail: string;
contactPhone?: string;
```

### 4. **List Base Schema Improvements**

All list-based schemas (Kit, Task, Shots, Timeline) now:

- Extend from flattened `listBaseConfigSchema`
- Have consistent Input/Update schemas
- Use proper type exports

---

## Migration Checklist

### For Each Schema File:

- [x] **list-base.schema.ts** - Flattened metadata, consistent patterns
- [x] **kit.schema.ts** - Updated to use flattened base schemas
- [x] **task.schema.ts** - Updated to use flattened base schemas
- [x] **shots.schema.ts** - Updated for couple and group shots
- [x] **timeline.schema.ts** - Flattened config and metadata
- [x] **project.schema.ts** - Completely flattened structure
- [x] **portal.schema.ts** - Flattened metadata fields

### Repository Updates Needed:

1. **Update all repository implementations** to handle flat fields:

   ```typescript
   // Before
   await setDoc(ref, {
     ...data,
     metadata: {
       totalItems: 0,
       lastModified: serverTimestamp(),
     },
   });

   // After
   await setDoc(ref, {
     ...data,
     totalItems: 0,
     createdAt: serverTimestamp(),
     updatedAt: serverTimestamp(),
   });
   ```

2. **Update parseSnapshot methods** to expect flat fields

3. **Update all queries** that filter/sort by nested fields:

   ```typescript
   // Before
   where('metadata.totalItems', '>', 0);

   // After
   where('totalItems', '>', 0);
   ```

### Service Updates Needed:

1. **Update validation calls** to use new Input/Update schemas
2. **Update default value creation** to use factory functions
3. **Remove any manual metadata construction**

### Hook Updates Needed:

1. **Update state management** to expect flat structures
2. **Update optimistic updates** to handle flat fields
3. **Remove any nested object destructuring**

---

## Benefits of Refactoring

### 1. **Better Firestore Performance**

- Flat fields are easier to index
- Simpler queries without nested field paths
- More efficient updates (update single fields vs. entire objects)

### 2. **Improved Type Safety**

```typescript
// Before - nested access prone to errors
user.metadata?.totalProjects || 0;

// After - direct access with defaults
user.totalProjects; // Already has default value
```

### 3. **Clearer Data Flow**

```typescript
// Before - unclear what fields can be updated
update({ metadata: { ...existing, totalItems: 5 } });

// After - explicit field updates
update({ totalItems: 5 });
```

### 4. **Easier Testing**

```typescript
// Before - complex mock objects
const mock = {
  config: { metadata: { totalItems: 0 } },
};

// After - flat mocks
const mock = {
  config: { totalItems: 0 },
};
```

---

## Breaking Changes

### Database Structure

⚠️ **This requires a data migration!**

You'll need to migrate existing Firestore documents from nested to flat structure:

```typescript
// Migration function example
async function migrateToFlatStructure(collectionPath: string) {
  const docs = await getDocs(collection(db, collectionPath));

  for (const doc of docs.docs) {
    const data = doc.data();

    // Extract nested fields
    const flatData = {
      ...data,
      // Flatten metadata
      totalCategories: data.metadata?.totalCategories || 0,
      totalItems: data.metadata?.totalItems || 0,
      createdBy: data.audit?.createdBy,
      lastModifiedBy: data.audit?.lastModifiedBy,
      // Remove old nested fields
      metadata: deleteField(),
      audit: deleteField(),
    };

    await updateDoc(doc.ref, flatData);
  }
}
```

### API Contracts

If you have external APIs or mobile apps consuming your data:

1. Update API response mappers to return flat structures
2. Provide backward compatibility layer if needed
3. Version your API endpoints during transition

---

## Next Steps

1. **Update ServiceFactory** to instantiate new user subcollection services
2. **Create UserManagementService** for composite operations
3. **Update all repositories** to use flat schema structures
4. **Run data migration** on Firestore collections
5. **Update UI components** to expect flat data structures
6. **Update tests** to use new schema patterns

---

## Example: Complete Schema Pattern

```typescript
// ============================================================================
// ENTITY SCHEMA
// ============================================================================
export const entitySchema = z.object({
  id: idSchema,
  userId: uuidSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),

  // Metadata (flattened)
  isActive: z.boolean().default(true),
  itemCount: z.number().int().min(0).default(0),

  // Timestamps
  createdAt: requiredTimestampSchema,
  updatedAt: optionalTimestampSchema.optional(),
});

export const entityInputSchema = entitySchema.omit({
  id: true,
  userId: true,
  itemCount: true,
  createdAt: true,
  updatedAt: true,
});

export const entityUpdateSchema = entityInputSchema.partial();

export const entityCreateSchema = entityInputSchema.extend({
  userId: uuidSchema,
});

// ============================================================================
// TYPES
// ============================================================================
export type Entity = z.infer<typeof entitySchema>;
export type EntityInput = z.infer<typeof entityInputSchema>;
export type EntityUpdate = z.infer<typeof entityUpdateSchema>;
export type EntityCreate = z.infer<typeof entityCreateSchema>;

// ============================================================================
// FACTORY
// ============================================================================
export const defaultEntity = (userId: string, input: EntityInput): Entity => ({
  id: '', // Generated by Firestore
  userId,
  ...input,
  itemCount: 0,
  createdAt: new Date(),
  updatedAt: undefined,
});
```

This pattern ensures consistency across your entire codebase!
