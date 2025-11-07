# Schema Defaults Best Practices

## The Golden Rule

**There are two types of defaults, each with their own purpose:**

1. **Infrastructure Defaults (Schema Layer)**: Use `.nullable().default(null)` for optional fields to prevent Firestore undefined errors
2. **Business Logic Defaults (Service/Repository Layer)**: Use factory functions for business defaults (e.g., `isPinned: false`, `source: 'photographer'`)

**Why this distinction matters:**

- **Infrastructure defaults** ensure data integrity at the persistence layer (Firestore rejects `undefined` values)
- **Business logic defaults** represent application rules and should be applied where business logic lives

**Reference:** See `Fixes-Done-User-Module.md` for the bug fix that necessitated infrastructure defaults at the schema layer.

---

## Where Defaults Belong

### ✅ **YES - Use Defaults Here**

#### 1. **Infrastructure Defaults** (in schema layer)

```typescript
export const baseUserSchema = z.object({
  id: idSchema,
  email: z.string().email(),
  displayName: z.string().min(1),
  phone: z.string().optional().nullable().default(null), // ✅ Infrastructure default
  bio: z.string().optional().nullable().default(null),   // ✅ Infrastructure default
  website: z.string().url().optional().nullable().default(null), // ✅ Infrastructure default
});
```

**Why?** Firestore rejects `undefined` values. Using `.nullable().default(null)` ensures optional fields are always `null` (valid) instead of `undefined` (invalid). This prevents runtime errors like:

```
Firestore Error: Unsupported field value: undefined (found in field phone)
```

**When to use:** Apply to all optional fields that may be omitted from user input or form submissions.

#### 2. **System-Generated Fields** (in base schema)

```typescript
export const listBaseItemSchema = z.object({
  id: idSchema,
  categoryId: idSchema.optional(),
  itemName: z.string().min(1).max(100),
  itemDescription: z.string().max(500),
  isCustom: z.boolean().default(false), // ✅ System field
  isChecked: z.boolean().default(false), // ✅ System field
  isDisabled: z.boolean().default(false), // ✅ System field
});
```

**Why?** These are managed by the system, not provided by users.

#### 3. **Business Logic Defaults** (in factory functions)

```typescript
export const defaultKitItem = (input: KitItemInput): Omit<KitItem, 'id'> => ({
  categoryId: undefined,
  itemName: input.itemName,
  itemDescription: input.itemDescription,
  quantity: input.quantity ?? 1, // ✅ Business logic default
  isPinned: false,                // ✅ Business logic default
  source: 'photographer',         // ✅ Business logic default
  isCustom: false,
  isChecked: false,
  isDisabled: false,
});
```

**Why?** Factory functions create complete, valid objects with sensible business defaults. These represent application rules (e.g., "new items are not pinned by default") rather than infrastructure constraints.

#### 4. **Repository Layer** (for business logic defaults)

```typescript
async create(payload: KitItemInput): Promise<Result<KitItem, AppError>> {
  const item = defaultKitItem(payload); // Use factory for business defaults
  
  const docRef = await addDoc(colRef, {
    ...item,
    createdAt: serverTimestamp(),
  });
  return await this.get(docRef.id);
}
```

**Why?** Repository can apply business logic defaults via factory functions. However, prefer factory functions for clarity and reusability.

---

### ❌ **NO - Don't Use Business Logic Defaults Here**

#### 1. **Domain-Specific Business Defaults in Schemas**

```typescript
// ❌ BAD - Business logic default in schema
export const kitItemSchema = listBaseItemSchema.extend({
  quantity: z.number().int().min(1).default(1), // ❌ Business default in schema
  isPinned: z.boolean().default(false),         // ❌ Business default in schema
});

// ✅ GOOD - Infrastructure default only (if optional)
export const kitItemSchema = listBaseItemSchema.extend({
  quantity: z.number().int().min(1), // Required field, no default
  notes: z.string().optional().nullable().default(null), // ✅ Infrastructure default OK
});
```

**Why?**

- Business logic defaults hide what data is actually required
- Creates confusion about what users must provide
- Business rules belong in factory functions, not validation schemas
- **Exception:** Infrastructure defaults (`.nullable().default(null)`) are required for optional fields to prevent Firestore errors

#### 2. **Input Schemas** (business logic defaults)

```typescript
// ❌ BAD - Business logic default in input schema
export const kitItemInputSchema = z.object({
  itemName: z.string().min(1),
  itemDescription: z.string().max(500),
  quantity: z.number().int().min(1).default(1), // ❌ Business default
});

// ✅ GOOD - Infrastructure default OK, business default in factory
export const kitItemInputSchema = z.object({
  itemName: z.string().min(1),
  itemDescription: z.string().max(500),
  quantity: z.number().int().min(1).optional(), // ✅ Optional (default applied in factory)
  notes: z.string().optional().nullable().default(null), // ✅ Infrastructure default OK
});
```

**Why?** Input schemas should validate what users provide. Infrastructure defaults prevent Firestore errors, but business logic defaults should be applied in factory functions.

---

## Practical Examples

### Example 1: User Profile (Infrastructure + Business Defaults)

This example demonstrates both infrastructure defaults (schema layer) and business logic defaults (factory layer) working together.

```typescript
// ============================================================================
// SCHEMA (Infrastructure defaults for optional fields)
// ============================================================================
export const baseUserSchema = z.object({
  id: idSchema,
  email: z.string().email(),
  displayName: z.string().min(1),
  // Infrastructure defaults: prevent Firestore undefined errors
  phone: z.string().optional().nullable().default(null),     // ✅ Infrastructure
  bio: z.string().optional().nullable().default(null),       // ✅ Infrastructure
  website: z.string().url().optional().nullable().default(null), // ✅ Infrastructure
  // Business defaults: NOT in schema (applied in factory)
  // isPinned: ❌ Don't default here
  // source: ❌ Don't default here
});

export const userInputSchema = baseUserSchema.omit({ id: true }).extend({
  phone: z.string().optional().nullable().default(null), // ✅ Infrastructure default OK
  bio: z.string().optional().nullable().default(null),   // ✅ Infrastructure default OK
});

// ============================================================================
// FACTORY (Business logic defaults)
// ============================================================================
export const defaultUserProfile = (input: UserInput): Omit<User, 'id'> => ({
  email: input.email,
  displayName: input.displayName,
  // Infrastructure defaults already handled by schema
  phone: input.phone ?? null,  // Schema ensures this is never undefined
  bio: input.bio ?? null,
  website: input.website ?? null,
  // Business logic defaults applied here
  isPinned: false,              // ✅ Business default
  source: 'photographer',       // ✅ Business default
  createdAt: new Date(),
});

// ============================================================================
// REPOSITORY (Uses factory, ensures Firestore compatibility)
// ============================================================================
async create(payload: UserInput): Promise<Result<User, AppError>> {
  // Schema validation ensures no undefined values
  const validation = validateWithSchema(userInputSchema, payload, context);
  if (!validation.success) return err(validation.error);

  // Factory applies business defaults
  const userData = defaultUserProfile(validation.value);

  const docRef = await addDoc(colRef, {
    ...userData,
    createdAt: serverTimestamp(),
  });

  return await this.get(docRef.id);
}

// ============================================================================
// USAGE
// ============================================================================
// User omits optional fields - infrastructure defaults handle it
await service.createUser({
  email: 'user@example.com',
  displayName: 'John Doe',
  // phone, bio, website omitted - schema defaults them to null
});

// Result: { email, displayName, phone: null, bio: null, website: null, isPinned: false, source: 'photographer' }
```

**Key Points:**

- **Infrastructure defaults** (`.nullable().default(null)`) in schema prevent Firestore errors
- **Business logic defaults** (`isPinned: false`) in factory represent application rules
- Schema ensures data integrity; factory ensures business logic consistency

---

### Example 2: Kit Item Creation

```typescript
// ============================================================================
// SCHEMA (No domain defaults)
// ============================================================================
export const kitItemSchema = listBaseItemSchema.extend({
  quantity: z.number().int().min(1),  // No default
});

export const kitItemInputSchema = listBaseItemInputSchema.extend({
  quantity: z.number().int().min(1).optional(),  // Optional
});

// ============================================================================
// FACTORY (Defaults applied)
// ============================================================================
export const defaultKitItem = (input: KitItemInput): Omit<KitItem, 'id'> => ({
  categoryId: undefined,
  itemName: input.itemName,
  itemDescription: input.itemDescription,
  quantity: input.quantity ?? 1,  // ✅ Default here
  isCustom: false,
  isChecked: false,
  isDisabled: false,
});

// ============================================================================
// REPOSITORY (Defaults applied)
// ============================================================================
async create(payload: KitItemInput): Promise<Result<KitItem, AppError>> {
  const item = defaultKitItem(payload);  // Use factory

  const docRef = await addDoc(colRef, {
    ...item,
    createdAt: serverTimestamp(),
  });

  return await this.get(docRef.id);
}

// ============================================================================
// SERVICE (Validation only)
// ============================================================================
async createItem(input: KitItemInput): Promise<Result<KitItem, AppError>> {
  // Validate input
  const validation = validateWithSchema(kitItemInputSchema, input, context);
  if (!validation.success) return err(validation.error);

  // Delegate to repository (which applies defaults)
  return await this.repository.create(validation.value);
}

// ============================================================================
// USAGE (Explicit or omit for default)
// ============================================================================
// User provides quantity
await service.createItem({
  itemName: "Camera",
  itemDescription: "Main camera body",
  quantity: 2,  // Explicit
});

// User omits quantity, gets default
await service.createItem({
  itemName: "Lens",
  itemDescription: "50mm prime",
  // quantity omitted, will become 1
});
```

---

## Additional Schema Default Patterns

### 1. **Infrastructure Defaults for Optional Fields** (Always Required)

```typescript
// ✅ REQUIRED for all optional fields
export const userSchema = z.object({
  phone: z.string().optional().nullable().default(null), // ✅ Always use this pattern
  bio: z.string().optional().nullable().default(null),   // ✅ Always use this pattern
});
```

**Why?** Firestore rejects `undefined`. This pattern prevents runtime errors.

### 2. **System Configuration Defaults**

```typescript
export const listBaseConfigSchema = z.object({
  type: z.nativeEnum(ListType),
  source: z.nativeEnum(ListSource).default(ListSource.MASTER_LIST), // ✅ System config
  defaultValues: z.boolean().default(true), // ✅ System config
  version: z.string().default('1.0.0'), // ✅ System config
});
```

**Why?** These are system configuration defaults, not user-provided data. Different from business logic defaults because they're infrastructure-level settings.

### 3. **System-Managed Boolean Flags**

```typescript
export const listBaseItemSchema = z.object({
  isCustom: z.boolean().default(false), // ✅ System-managed
  isChecked: z.boolean().default(false), // ✅ System-managed
  isDisabled: z.boolean().default(false), // ✅ System-managed
});
```

**Why?** These are system state flags, not business rules or user preferences.

---

## Decision Tree

```
Is this field...
├─ Optional field that may be undefined? (phone, bio, notes)
│  └─ ✅ Infrastructure default in schema: .nullable().default(null)
│     └─ Prevents Firestore "undefined" errors
├─ System-generated? (id, timestamps, createdBy)
│  └─ ✅ Default in base schema
├─ System-managed? (isCustom, isDisabled)
│  └─ ✅ Default in base schema
├─ System configuration? (version, source)
│  └─ ✅ Default in config schema
├─ Business rule default? (isPinned: false, source: 'photographer')
│  └─ ❌ No default in schema
│     └─ ✅ Default in factory function
└─ Domain-specific data? (quantity, time, description)
   └─ ❌ No business default in schema
      └─ ✅ Default in factory/repository
```

---

## Benefits of This Approach

### 1. **Clear Separation of Concerns**

```typescript
// Schema = Structure & Validation
// Factory = Default Population
// Repository = Persistence & System Fields
```

### 2. **Explicit API Contracts**

```typescript
// Users know exactly what's required
type KitItemInput = {
  itemName: string;
  itemDescription: string;
  quantity?: number; // Clear: optional means has default
};
```

### 3. **Flexible Testing**

```typescript
// Test with minimal data
const input = {
  itemName: 'Test',
  itemDescription: 'Test item',
  // No quantity needed
};

// Or test with explicit data
const input = {
  itemName: 'Test',
  itemDescription: 'Test item',
  quantity: 5,
};
```

### 4. **Better Error Messages**

```typescript
// ❌ With defaults: "quantity must be at least 1" (confusing)
// ✅ Without defaults: "quantity is required" or "quantity must be at least 1" (clear)
```

---

## Summary

| Field Type            | Example                  | Default Location              | Pattern                          |
| --------------------- | ------------------------ | ----------------------------- | -------------------------------- |
| Optional fields       | `phone`, `bio`, `notes`  | Schema (infrastructure)       | `.nullable().default(null)`      |
| System-generated      | `id`, `createdAt`        | Base schema                   | `.default(value)`                 |
| System-managed        | `isCustom`, `isDisabled` | Base schema                   | `.default(false)`                 |
| System configuration  | `version`, `source`       | Config schema                 | `.default(value)`                 |
| Business rules        | `isPinned`, `source`     | Factory function              | Applied in factory, not schema   |
| Domain data           | `quantity`, `time`        | Factory/Repository            | Applied in factory, not schema   |
| Required user input   | `name`, `description`    | ❌ Never                      | No defaults                      |

**Key Rules:**

1. **Infrastructure defaults** (`.nullable().default(null)`) are **required** for all optional fields to prevent Firestore errors
2. **Business logic defaults** belong in factory functions, not schemas
3. **System defaults** (system-generated, system-managed, config) can be in schemas
4. **User-provided data** should never have defaults in schemas

**Reference:** See `Fixes-Done-User-Module.md` for the bug fix that necessitated infrastructure defaults at the schema layer.
