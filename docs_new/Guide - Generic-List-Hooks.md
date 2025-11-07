# Generic List Hook Implementation Guide

## Overview

The generic `useList` hook eliminates **~2,800 lines** of duplicated code across 4 list hooks, reducing them to **4 lines each**.

---

## The Problem

### Before: Massive Duplication

Each list hook (Task, Kit, CoupleShot, GroupShot) had ~700 lines of **identical** code:

```
use-task-list.ts         → 700 lines
use-kit-list.ts          → 700 lines
use-couple-shot-list.ts  → 700 lines
use-group-shot-list.ts   → 700 lines
─────────────────────────────────────
TOTAL                    → 2,800 lines
```

### Issues:

- ❌ Bug fixes needed in 4 places
- ❌ New features added 4 times
- ❌ Testing duplicated across all hooks
- ❌ Hard to maintain consistency
- ❌ Massive cognitive overhead

---

## The Solution

### After: Single Source of Truth

```
use-generic-list.ts (generic) → 700 lines (reusable)
list-hooks.ts (wrappers)      → 50 lines (type-specific)
─────────────────────────────────────
TOTAL MAINTAINED              → 750 lines
SAVINGS                       → 2,050 lines (73% reduction!)
```

---

## Implementation

### 1. Generic Hook (`use-generic-list.ts`)

The generic hook handles all common list operations:

```typescript
export function useList<TList extends GenericList, TItem extends ListBaseItem>(
  hookName: string,
  service: IListService<TList, TItem>,
  options: UseListOptions = {},
): UseListResult<TList, TItem> {
  // All the logic in one place
}
```

**Key Features:**

- ✅ Type-safe with generics
- ✅ Works with any list type
- ✅ Optimistic updates
- ✅ Real-time subscriptions
- ✅ Error handling
- ✅ Loading states

### 2. Type-Specific Wrappers (`list-hooks.ts`)

Each specific hook is now just 4 lines:

```typescript
export function useTaskList(
  service: TaskListService,
  options?: UseListOptions,
): UseListResult<TaskList, TaskItem> {
  return useList<TaskList, TaskItem>('useTaskList', service, options);
}
```

**Benefits:**

- ✅ Type inference preserved
- ✅ Clean API surface
- ✅ Easy to use
- ✅ No duplication

---

## Usage Examples

### Basic Usage

```typescript
import { useTaskList } from '@/hooks/list-hooks';
import { taskService } from '@/services/ServiceFactory';

function TaskListComponent() {
  const {
    list,
    loading,
    error,
    addUserItem,
    deleteUserItem,
    refresh
  } = useTaskList(taskService, {
    userId: currentUser.id,
    autoFetch: true,
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <div>
      {list?.items.map(item => (
        <TaskItem
          key={item.id}
          item={item}
          onDelete={() => deleteUserItem(item.id)}
        />
      ))}
    </div>
  );
}
```

### Real-Time Updates

```typescript
function LiveKitList() {
  const { list, addProjectItem } = useKitList(kitService, {
    projectId: currentProject.id,
    enableRealtime: true, // ✅ Live updates!
    onSuccess: (list) => {
      console.log('List updated:', list);
    },
  });

  return <KitListView items={list?.items} />;
}
```

### Optimistic Updates

```typescript
function OptimisticShotList() {
  const {
    list,
    batchUpdateUserItems
  } = useCoupleShotList(coupleShotService, {
    userId: user.id,
    autoFetch: true,
  });

  const handleBulkSelect = async (itemIds: string[]) => {
    // UI updates immediately!
    const updates = itemIds.map(id => ({
      id,
      clientSelected: true,
    }));

    await batchUpdateUserItems(updates);
  };

  return <ShotSelector items={list?.items} />;
}
```

### Master List Pattern

```typescript
function MasterListManager() {
  const {
    getMaster,
    createOrResetUserList,
    list: masterList
  } = useTaskList(taskService);

  const handleResetToMaster = async () => {
    await getMaster(); // Fetch master
    if (masterList) {
      await createOrResetUserList(masterList); // Reset user's list
    }
  };

  return <ResetButton onClick={handleResetToMaster} />;
}
```

---

## Service Requirements

Your services must implement the `IListService` interface:

```typescript
export interface IListService<TList extends GenericList, TItem extends ListBaseItem> {
  // Master operations
  getMaster(): Promise<Result<TList, AppError>>;

  // User operations
  getUserList(userId: string): Promise<Result<TList, AppError>>;
  saveUserList(userId: string, list: TList): Promise<Result<TList, AppError>>;
  createOrResetUserList(userId: string, sourceList: TList): Promise<Result<TList, AppError>>;
  deleteUserList(userId: string): Promise<Result<void, AppError>>;

  // User item operations
  addUserItem(userId: string, item: TItem): Promise<Result<TItem, AppError>>;
  deleteUserItem(userId: string, itemId: string): Promise<Result<void, AppError>>;
  batchUpdateUserItems(
    userId: string,
    updates: Array<{ id: string } & Partial<TItem>>,
  ): Promise<Result<void, AppError>>;
  batchDeleteUserItems(userId: string, itemIds: string[]): Promise<Result<void, AppError>>;

  // Project operations
  getProjectList(projectId: string): Promise<Result<TList, AppError>>;
  saveProjectList(projectId: string, list: TList): Promise<Result<TList, AppError>>;
  createOrResetProjectList(
    userId: string,
    projectId: string,
    sourceList: TList,
  ): Promise<Result<TList, AppError>>;
  deleteProjectList(projectId: string): Promise<Result<void, AppError>>;

  // Project item operations
  addProjectItem(projectId: string, item: TItem): Promise<Result<TItem, AppError>>;
  deleteProjectItem(projectId: string, itemId: string): Promise<Result<void, AppError>>;
  batchUpdateProjectItems(
    projectId: string,
    updates: Array<{ id: string } & Partial<TItem>>,
  ): Promise<Result<void, AppError>>;
  batchDeleteProjectItems(projectId: string, itemIds: string[]): Promise<Result<void, AppError>>;

  // Optional: Real-time subscriptions
  subscribeToUserList?(
    userId: string,
    onData: (result: Result<TList, AppError>) => void,
  ): () => void;
  subscribeToProjectList?(
    projectId: string,
    onData: (result: Result<TList, AppError>) => void,
  ): () => void;
}
```

---

## Migration Guide

### Step 1: Update Services (if needed)

Ensure your services implement `IListService`:

```typescript
// Before
class TaskListService {
  async getUserList(userId: string): Promise<Result<TaskList, AppError>> { ... }
  // ... other methods
}

// After (add interface)
class TaskListService implements IListService<TaskList, TaskItem> {
  async getUserList(userId: string): Promise<Result<TaskList, AppError>> { ... }
  // ... must implement all interface methods
}
```

### Step 2: Replace Individual Hooks

```typescript
// Before
import { useTaskList } from '@/hooks/use-task-list';

// After
import { useTaskList } from '@/hooks/list-hooks';

// Usage stays exactly the same!
const { list, loading } = useTaskList(taskService, {
  userId: user.id,
  autoFetch: true,
});
```

### Step 3: Delete Old Files

```bash
# Delete the old individual hook files
rm src/hooks/use-task-list.ts
rm src/hooks/use-kit-list.ts
rm src/hooks/use-couple-shot-list.ts
rm src/hooks/use-group-shot-list.ts

# Keep only
# - src/hooks/use-generic-list.ts (generic)
# - src/hooks/list-hooks.ts (wrappers)
```

---

## Benefits

### 1. **Maintainability**

```diff
- Fix bug in 4 places
+ Fix bug in 1 place
```

### 2. **Consistency**

All lists now have **identical** behavior:

- Same optimistic update logic
- Same error handling
- Same loading states
- Same real-time subscription behavior

### 3. **Type Safety**

```typescript
// Fully typed!
const { list } = useTaskList(service);
//     ^? TaskList | null

const { list } = useKitList(service);
//     ^? KitList | null

// TypeScript knows the exact type
list?.items.forEach(item => {
  // item is TaskItem | KitItem depending on hook
});
```

### 4. **Testability**

```typescript
// Test generic hook once
describe('useList', () => {
  it('handles optimistic updates', async () => {
    // Test with mock list type
  });
});

// Type-specific hooks need minimal testing
describe('useTaskList', () => {
  it('passes correct types to generic hook', () => {
    // Simple type check
  });
});
```

### 5. **Extensibility**

Add a new list type in seconds:

```typescript
// 1. Create schema
export type PhotoRequestList = z.infer<typeof photoRequestListSchema>;
export type PhotoRequestItem = z.infer<typeof photoRequestItemSchema>;

// 2. Create service implementing IListService
class PhotoRequestService implements IListService<PhotoRequestList, PhotoRequestItem> {
  // Implement interface methods
}

// 3. Add wrapper hook (4 lines!)
export function usePhotoRequestList(
  service: PhotoRequestService,
  options?: UseListOptions,
): UseListResult<PhotoRequestList, PhotoRequestItem> {
  return useList<PhotoRequestList, PhotoRequestItem>('usePhotoRequestList', service, options);
}

// Done! 🎉
```

---

## Advanced Patterns

### Composite Hook for Multiple Lists

```typescript
export function useProjectLists(projectId: string) {
  const tasks = useTaskList(taskService, { projectId, enableRealtime: true });
  const kit = useKitList(kitService, { projectId, enableRealtime: true });
  const coupleShots = useCoupleShotList(coupleShotService, { projectId });
  const groupShots = useGroupShotList(groupShotService, { projectId });

  return {
    tasks,
    kit,
    coupleShots,
    groupShots,
    loading: tasks.loading || kit.loading || coupleShots.loading || groupShots.loading,
    hasErrors: !!(tasks.error || kit.error || coupleShots.error || groupShots.error),
    refreshAll: async () => {
      await Promise.all([
        tasks.refresh(),
        kit.refresh(),
        coupleShots.refresh(),
        groupShots.refresh(),
      ]);
    },
  };
}
```

### Conditional Lists

```typescript
function useConditionalList(listType: 'task' | 'kit', userId: string) {
  const taskList = useTaskList(taskService, {
    userId,
    autoFetch: listType === 'task',
  });

  const kitList = useKitList(kitService, {
    userId,
    autoFetch: listType === 'kit',
  });

  return listType === 'task' ? taskList : kitList;
}
```

---

## Summary

| Metric                | Before | After | Improvement |
| --------------------- | ------ | ----- | ----------- |
| **Total Lines**       | 2,800  | 750   | -73%        |
| **Files to Maintain** | 4      | 2     | -50%        |
| **Duplication**       | 100%   | 0%    | ✅          |
| **Type Safety**       | ✅     | ✅    | Same        |
| **Features**          | ✅     | ✅    | Same        |
| **Testing Effort**    | 4x     | 1x    | -75%        |
| **Bug Fix Time**      | 4x     | 1x    | -75%        |
| **New Feature Time**  | 4x     | 1x    | -75%        |

**Result:** Same functionality, 73% less code, 75% less maintenance! 🎉
