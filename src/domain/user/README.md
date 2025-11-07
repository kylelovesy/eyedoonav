# EyeDoo Schema Documentation

A comprehensive, type-safe schema system for the EyeDoo photography event management application.

## Overview

This schema library provides:

- ✅ **Type Safety**: Full TypeScript support with Zod validation
- 🔒 **Security**: Input validation and sanitization
- 📦 **Modularity**: Organized by domain with clear separation of concerns
- 🔄 **Reusability**: Base schemas extended across domains
- 🎯 **Developer Experience**: Clear patterns for inputs, updates, and queries

## Architecture

### Base Schemas (`base.schema.ts`)

Foundation schemas used throughout the application:

- ID validation (UUID, Firebase UID)
- String schemas (email, password, display name, URL, phone)
- Timestamp handling with Firestore compatibility
- Composable objects (person info, contact info, geo points, social media)
- Metadata and audit trails

### Domain Organization

#### Authentication (`auth.schema.ts`)

- Sign up with password confirmation
- Sign in with remember me
- Password reset and change workflows
- Email verification

#### User Management (`user.schema.ts`)

- User profiles with preferences
- Subscription management
- Setup tracking
- Project associations

#### Project Management (`project.schema.ts`)

- Project creation and updates
- Event details and participants
- Photo information collection
- Project filtering and sorting

#### List Management

Base list schemas (`list-base.schema.ts`) extended by:

- **Tasks** (`task.schema.ts`) - Checklist functionality
- **Kit** (`kit.schema.ts`) - Equipment with quantities
- **Shots** (`shots.schema.ts`) - Couple and group photo lists
- **Key People** (`key-people.schema.ts`) - Important individuals
- **Locations** (`location.schema.ts`) - Venue management
- **Timeline** (`timeline.schema.ts`) - Event scheduling
- **Photo Requests** (`photo-request.schema.ts`) - Client requests

#### Client Portal (`portal.schema.ts`)

- Multi-step client collaboration
- Step-specific data structures
- Access control and expiry
- Progress tracking

#### Business Features

- **Business Cards** (`business-card.schema.ts`) - Professional branding
- **Vendors** (`vendor.schema.ts`) - Service provider management

#### Content Management

- **Tags** (`tag.schema.ts`) - Content organization
- **Notes** (`notes.schema.ts`) - Standalone and unified notes

#### System Features

- **Notifications** (`notification.schema.ts`) - Alert management
- **Weather** (`weather.schema.ts`) - Forecast integration

#### User Experience

- **Onboarding** (`onboarding.schema.ts`) - Tutorial flows
- **Setup** (`setup.schema.ts`) - Configuration management

## Schema Patterns

### 1. Main Schema

The complete entity structure:

```typescript
export const entitySchema = z.object({
  id: idSchema,
  // ... all fields
  createdAt: requiredTimestampSchema,
  updatedAt: optionalTimestampSchema,
});
```

### 2. Input Schema

For creation (omits generated fields):

```typescript
export const entityInputSchema = entitySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  // ... other generated fields
});
```

### 3. Update Schema

For partial updates:

```typescript
export const entityUpdateSchema = entitySchema
  .omit({
    id: true,
    createdAt: true,
    // ... immutable fields
  })
  .partial();
```

### 4. Query Schemas

For filtering and sorting:

```typescript
export const entityFilterSchema = z.object({
  status: z.enum([...]).optional(),
  searchTerm: z.string().optional(),
  // ... filter fields
});

export const entitySortSchema = z.object({
  field: z.enum(['createdAt', 'name', ...]),
  direction: z.enum(['asc', 'desc']).default('desc'),
});
```

### 5. Batch Operations

For bulk actions:

```typescript
export const entityBatchUpdateSchema = z.object({
  entityIds: z.array(idSchema).min(1),
  update: entityUpdateSchema,
});
```

## Usage Examples

### Basic Validation

```typescript
import { projectInputSchema } from './schemas';

const result = projectInputSchema.safeParse(data);
if (result.success) {
  // data is valid
  const project = result.data;
} else {
  // handle errors
  console.error(result.error.errors);
}
```

### Type Inference

```typescript
import { type Project, type ProjectInput } from './schemas';

const createProject = (input: ProjectInput): Promise<Project> => {
  // TypeScript knows the exact shape
  return api.post('/projects', input);
};
```

### Extending Schemas

```typescript
import { baseItemSchema } from './list-base.schema';

const customItemSchema = baseItemSchema.extend({
  customField: z.string(),
});
```

### Refinements

```typescript
const itemWithValidationSchema = itemInputSchema.refine(data => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});
```

## Best Practices

### 1. Always Use Type Inference

```typescript
// ✅ Good
type User = z.infer<typeof userSchema>;

// ❌ Avoid manual types that can drift
type User = { id: string; name: string; ... };
```

### 2. Validate at Boundaries

```typescript
// API endpoints, form submissions, external data
app.post('/users', async (req, res) => {
  const result = userInputSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.errors });
  }
  // proceed with valid data
});
```

### 3. Use Appropriate Schemas

```typescript
// Creating
const input: UserInput = await userInputSchema.parseAsync(formData);

// Updating (partial)
const update: UserUpdate = await userUpdateSchema.parseAsync(changes);

// Querying
const filter: UserFilter = await userFilterSchema.parseAsync(queryParams);
```

### 4. Leverage Defaults

```typescript
const configSchema = z.object({
  enabled: z.boolean().default(true),
  retries: z.number().default(3),
});

// Missing fields get defaults
configSchema.parse({}); // { enabled: true, retries: 3 }
```

### 5. Handle Timestamps Properly

```typescript
// The preprocessor handles multiple formats
const dateInput = '2024-01-15';
const firestoreTimestamp = Timestamp.now();
const jsDate = new Date();

// All work with requiredTimestampSchema
requiredTimestampSchema.parse(dateInput);
requiredTimestampSchema.parse(firestoreTimestamp);
requiredTimestampSchema.parse(jsDate);
```

## Security Considerations

### Input Sanitization

All string inputs are trimmed and validated:

```typescript
// Email: lowercased, trimmed, max length
emailSchema.parse('  USER@EXAMPLE.COM  ');
// → 'user@example.com'

// Display name: trimmed, length limits
displayNameSchema.parse('  John Doe  ');
// → 'John Doe'
```

### Password Requirements

```typescript
// Minimum 8 chars, uppercase, lowercase, number
passwordSchema.parse('weak'); // ❌ throws
passwordSchema.parse('Strong123'); // ✅ passes
```

### UUID Validation

```typescript
// Prevents injection attacks
idSchema.parse('123'); // ❌ not a valid UUID
idSchema.parse('550e8400-e29b-41d4-a716-446655440000'); // ✅
```

## Performance Tips

### 1. Parse Once

```typescript
// ✅ Parse at entry point
const validated = schema.parse(input);
// Use validated data throughout

// ❌ Don't re-parse
schema.parse(data);
schema.parse(data); // wasteful
```

### 2. Use safeParse for User Input

```typescript
// Better error handling for forms
const result = schema.safeParse(formData);
if (!result.success) {
  // Show user-friendly errors
  displayErrors(result.error.format());
}
```

### 3. Lazy Validation

```typescript
// For optional expensive validations
const expensiveSchema = z.lazy(() => complexSchema.refine(expensiveCheck));
```

## Migration Guide

### From Plain Types

```typescript
// Before
interface User {
  id: string;
  email: string;
  // ...
}

// After
import { type User } from './schemas';
// Type is auto-generated from schema
```

### Adding Validation

```typescript
// Before: no validation
const user = req.body as User;

// After: validated
const user = userInputSchema.parse(req.body);
```

## Contributing

When adding new schemas:

1. **Follow patterns**: Use existing schemas as templates
2. **Extend base schemas**: Reuse `baseItemSchema`, `auditSchema`, etc.
3. **Provide all variants**: Main, Input, Update, Filter, Sort
4. **Add refinements**: Custom validation rules as needed
5. **Export types**: Use `z.infer<>` for type generation
6. **Document**: Add JSDoc comments for complex logic

## Testing Schemas

```typescript
import { describe, it, expect } from 'vitest';
import { userInputSchema } from './schemas';

describe('userInputSchema', () => {
  it('validates correct input', () => {
    const input = {
      displayName: 'John Doe',
      email: 'john@example.com',
      // ...
    };
    expect(() => userInputSchema.parse(input)).not.toThrow();
  });

  it('rejects invalid email', () => {
    const input = { email: 'invalid', displayName: 'John' };
    expect(() => userInputSchema.parse(input)).toThrow();
  });
});
```

## License

Part of the EyeDoo application. All rights reserved.

---

**Last Updated**: October 27, 2025  
**Version**: 1.0.0
