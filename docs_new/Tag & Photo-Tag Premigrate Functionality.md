# Tag & Photo-Tag — Reference

This document consolidates all information related to Tag and Photo-Tag functionality in the project: types/schemas, store shape, services, hooks, UI components, screens, and recommended next steps. Use this as a single source of truth when working on tag-related features.

---

## Key source files

- Types and schemas: `src/types-old/domain/tag.ts`
- Store: `src/stores/use-tag-store.ts`
- Services:
  - `src/services/tag-service.ts` (mock tag service)
  - `src/services/photo-tag-link-service.ts` (local filesystem photo-tag link storage)
- Hooks / actions:
  - `src/hooks/use-tag-actions.ts`
  - `src/hooks/use-tag-input-actions.ts`
- UI components:
  - `src/components/tags/tag-form-modal.tsx`
  - `src/components/custom/tag-input.tsx`
- Screens:
  - `src/app/(features)/tagPhoto.tsx` (Tag a photo screen)
  - `src/app/(dashboard)/(tools)/tags.tsx` (Photo tags listing screen)
- Constants: `src/constants/tags-types.ts`
- Tests: `src/components/__tests__/tag-form-modal.test.tsx`

---

## Overview

High-level concepts:

- Tag: a label that can be created by a user and attached to photos or other entities.
- TagAssignment / PhotoTagLink: the link between one or more tags and a photo (or other entity), persisted locally as JSON via the photo-tag link service.
- Tag flows include creating/updating/deleting tags, tagging a photo (create link with tag ids + photo URI), editing tags on an existing photo, and removing photo-tag links (plus the image file when deleting a link).

This app uses:

- Zod schemas for runtime validation of types
- A centralized Zustand store (`useTagStore`) for tags and photoTagLinks
- Services to abstract storage/business logic
- Hooks (`useTagActions` and `useTagInputActions`) to coordinate UI and store updates
- Presentation components (TagInput, TagFormModal) for interaction

---

## Types & Schemas

Source: `src/types-old/domain/tag.ts`

Important zod schemas and types (summarized):

- TagSchema
  - id: string (uuid)
  - userId: string
  - title: string (1..50)
  - description?: string (<=500)
  - color?: TagColor
  - category: TagCategory (default OTHER)
  - projectId?: string
  - createdAt?: Date
  - linkUri?: string
  - photoId?: string
  - usage: number (default 0)
  - isGlobal: boolean (default false)

- TagInputSchema: TagSchema minus id, userId, createdAt, projectId, usage, isGlobal (used for form inputs)

- TagAssignmentSchema
  - id: string
  - tagId: string
  - photoId: string
  - userId: string
  - entity: { id: string; type: TagLinkType }

- TagAssignmentInputSchema: TagAssignmentSchema without id and userId

- PhotoTagLinkSchema
  - id: string
  - photoUri: string
  - tagIds: string[]
  - projectId: string
  - createdAt: Date

Types exported (inferred from schemas):

- Tag, TagInput, TagAssignment, TagAssignmentInput, PhotoTagLink

Note: PhotoTagLink is the canonical shape used for tagging photos in local storage.

---

## Store

Source: `src/stores/use-tag-store.ts`

State shape (key fields):

- tags: Tag[]
- photoTagLinks: TagAssignment[] (the store keeps photo-tag links here; the code treats these as TagAssignment-like objects / `PhotoTagLink` in other places)
- isModalVisible: boolean
- tagToEdit: Tag | null

Mutators / actions (state-only):

- setTags(tags: Tag[])
- addTagToState(tag: Tag)
- updateTagInState(tag: Tag)
- removeTagInState(tagId: string)

- setTagAssignments(links: TagAssignment[])
- addTagAssignmentToState(link: TagAssignment)
- updateTagAssignmentInState(link: TagAssignment)
- removeTagAssignmentFromState(linkId: string)

UI modal helpers:

- openModal(tag?: Tag)
- closeModal()

Notes:

- The store is used as the single source of truth for tags and photo-tag links across the app.

---

## Services

### TagService (`src/services/tag-service.ts`)

- A local/mock service that stores a list of tags in memory (built from `WEDDING_TAG_SUGGESTIONS`).
- API:
  - list(): Promise<Result<Tag[], AppError>>
  - create(input): Promise<Result<Tag, AppError>> — validates via TagSchema, checks duplicates by normalized title
  - update(tag): Promise<Result<Tag, AppError>> — validates and updates existing
  - remove(tagId): Promise<Result<void, AppError>>

Behavior notes:

- Uses a small API_DELAY to mimic network
- `create` and `update` prevent duplicate titles (case-insensitive)
- For production, replace with an API-backed implementation that persists tags per user/project

### PhotoTagLinkService (`src/services/photo-tag-link-service.ts`)

- Responsible for persisting `PhotoTagLink` objects as JSON files under the app documents directory in `photoTagLinks/`.
- File layout: `${fileSystemService.getDocumentDirectory()}photoTagLinks/${id}.json`.

APIs:

- getPhotoTagLinksLocally(): reads all JSON files in the directory, parses them via `PhotoTagLinkSchema`, sorts by createdAt desc
- savePhotoTagLinkLocally(photoTagLink: PhotoTagLink): writes JSON file for the link (createdAt saved as ISO string)
- updatePhotoTagLinkLocally(updatedLink: PhotoTagLink): validates file exists then overwrites
- deletePhotoTagLinkLocally(linkId: string): attempts to read JSON, delete the referenced photoUri (image file), then delete the JSON file; gracefully handles missing files

Behavior notes:

- Corrupted files are skipped during read
- Directory is created automatically when needed
- Uses ErrorMapper and Result pattern for consistent error handling

---

## Hooks / Actions

### useTagActions (`src/hooks/use-tag-actions.ts`)

Exposes higher-level operations used by screens and components:

- loadTags(): loads tags from TagService and sets `tags` in store
- createTag(input): calls TagService.create, adds tag to state, closes modal, shows toast
- updateTag(tag): calls TagService.update, updates state, closes modal, shows toast
- deleteTag(tagId): calls TagService.remove, removes from state

PhotoTagLink operations:

- loadPhotoTagLinks(): loads via photoTagLinkService.getPhotoTagLinksLocally and sets in store
- addPhotoTagLink(photoUri, tagIds, projectId): creates a PhotoTagLink with uuid, saves locally, adds to state
- updatePhotoTagLink(linkId, newTagIds): updates link in file system and in state
- removePhotoTagLink(linkId): deletes link (and referenced photo) and removes from state

Notes:

- All operations use `withLoading` to set loading keys and show toast messages on success
- Errors are handled by AppErrorHandler and ErrorMapper

### useTagInputActions (`src/hooks/use-tag-input-actions.ts`)

Used by `TagInput` component for inline create-from-text behavior.

API:

- createTag(text: string, userId: string): Promise<Tag | undefined>
- isCreating: boolean

Behavior:

- Calls TagService.create with default category and isGlobal=false
- Shows toast on success; handles errors via AppErrorHandler

---

## Components

### TagFormModal (`src/components/tags/tag-form-modal.tsx`)

Props:

- visible: boolean
- initialValues?: Partial<TagInput>
- onDismiss: () => void
- onSubmit: (data: TagInput) => Promise<boolean>
- mode?: 'create' | 'edit' (default 'create')

Behavior:

- Renders `UnifiedFormModal` using form config from `getTagFormConfig(mode)`
- `handleSubmit` cleans strings and forwards to `onSubmit` prop
- Returns a `Result<TagInput, AppError>` indicating success or validation failure

Test coverage: `src/components/__tests__/tag-form-modal.test.tsx` covers render, submit and modal dismiss behavior.

### TagInput (`src/components/custom/tag-input.tsx`)

Props:

- availableTags: Tag[]
- selectedTags: Tag[]
- onSelectionChange: (tags: Tag[]) => void
- userId: string
- label?: string (default 'Tags')

Behavior & UI:

- TextInput + suggestions (FlatList)
- Shows selected tags as chips (closeable)
- Filters suggestions based on input text and excludes already selected tags
- Inline create: pressing the plus icon calls `createTag` from `useTagInputActions` and, on success, adds the created tag to selected tags

Notes:

- Prevents duplicate selection
- Disables creation while `isCreating` is true

---

## Screens / Usage

### Tag Photo Screen (`src/app/(features)/tagPhoto.tsx`)

- Receives `photoUri`, optional `photoTagLinkId`, and `projectId` via params
- If `photoTagLinkId` is passed -> edit mode: pre-populate selected tags using store
- If creating new: validates photo exists (FileSystem) then calls `addPhotoTagLink(photoUri, tagIds, projectId)`
- Save button either updates existing link or creates a new link, then navigates back (or to tags list)
- Provides an example `handleCreateTag` function which delegates to `useTagActions().createTag(...)`

### Tags Screen (`src/app/(dashboard)/(tools)/tags.tsx`)

- Loads tags & photoTagLinks on mount
- Filters photoTagLinks by `activeProject.id`
- Renders each `PhotoTagLink` with image preview, action icons (share, edit, delete), and linked tag chips
- Edit photo navigates to TagPhoto screen with `photoTagLinkId`
- Create Tag opens `TagFormModal`

---

## File storage & directory

- Photo tag links are saved under the app documents directory within a subfolder `photoTagLinks/`.
- Each link is stored as `${id}.json` and contains at minimum: id, photoUri, tagIds, projectId, createdAt (ISO string)
- When deleting a photo-tag link, the service attempts to delete both the image file (photoUri) and the JSON file.

---

## Workflows

1. Create a Tag (via TagFormModal or inline in TagInput)
   - User fills form or types a tag name in TagInput
   - TagService.create validates and returns new Tag
   - Store is updated and UI shows success toast

2. Tag a Photo (create PhotoTagLink)
   - From TagPhoto screen: user selects tags and presses Save
   - `useTagActions.addPhotoTagLink` constructs PhotoTagLink with uuid and createdAt
   - PhotoTagLinkService.savePhotoTagLinkLocally writes JSON file
   - Store is updated with new link

3. Edit Photo Tags
   - Load existing PhotoTagLink from store via id
   - Update tagIds and call `photoTagLinkService.updatePhotoTagLinkLocally`
   - Update store

4. Delete Photo Tag Link
   - `photoTagLinkService.deletePhotoTagLinkLocally(linkId)` attempts to delete referenced photo and json file
   - Remove from store

---

## Edge cases & error handling

- Corrupted JSON files: `getPhotoTagLinksLocally` skips corrupted files and continues loading
- Missing photo file during save or delete: `deletePhotoTagLinkLocally` catches and still attempts to remove link JSON file
- Duplicate tag titles prevented by TagService (case-insensitive title normalize)
- UI prevents creating empty tag names; TagInput prevents creation if input is empty or isCreating
- When reading directory or files fails, APIs return Result.err with AppError mapped by ErrorMapper

---

## Tests

- `src/components/__tests__/tag-form-modal.test.tsx` covers basic modal behavior. Consider adding tests for:
  - `TagInput` behavior: selection, creation flow (mock `useTagInputActions`)
  - `photo-tag-link-service` file read/write/update/delete behavior (use fileSystemService mocks)
  - `useTagActions` integration tests with mocked services

---

## Notes on naming & types

- The project mixes `TagAssignment` and `PhotoTagLink` naming; `PhotoTagLink` is the concrete persisted shape used by photo tagging. Consider consolidating naming and types to reduce confusion.
- `src/types-old/domain/tag.ts` indicates types might be legacy; check if a newer `@domain/tag` barrel exists and migrate references.

---

## Suggested next steps

- Migrate `types-old` to the main `src/types` (or remove the `-old` suffix) and ensure imports use the authoritative domain module.
- Add more unit tests around `photo-tag-link-service` and `useTagActions`.
- Add Storybook stories (or component docs) for `TagInput` and `TagFormModal` to make visual QA easier.
- Add an explicit mapping layer between `PhotoTagLink` (persisted) and `TagAssignment` (store) if the shapes diverge.
- Consider extracting filesystem behavior behind a small repository interface with an in-memory implementation for tests.

---

## Quick references

- Photo tags directory: `fileSystemService.getDocumentDirectory() + 'photoTagLinks/'`
- PhotoTagLink required fields: `id, photoUri, tagIds[], projectId, createdAt`

---

If you'd like, I can:

- Add this file to a different location or format (e.g., README-style or wiki entry).
- Generate a migration plan that consolidates `types-old` into `src/types` and updates imports.
- Add tests for `photo-tag-link-service` (I can scaffold test files and mock `fileSystemService`).

Tell me which follow-up you'd like next.
