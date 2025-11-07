// src/repositories/firestore/list.repository.ts
import { FirestoreListRepository } from './firestore-list-repository';
import { CoupleShotList, CoupleShotItem, coupleShotListSchema } from '@/domain/user/shots.schema';
import { GroupShotList, GroupShotItem, groupShotListSchema } from '@/domain/user/shots.schema';
import { KitList, KitItem, kitListSchema } from '@/domain/user/kit.schema';
import { TaskList, TaskItem, taskListSchema } from '@/domain/user/task.schema';
// import { LocationList, LocationItem, locationListSchema } from '@/domain/project/location.schema';
// import { TimelineList, TimelineEvent, timelineListSchema } from '@/domain/project/timeline.schema';
import { ListType } from '@/constants/enums';
import { ZodSchema } from 'zod';
import {
  MASTER_LIST_PATHS,
  PROJECT_LIST_PATHS,
  USER_LIST_PATHS,
} from './paths/firestore-list-paths';
import { VendorItem, VendorList, vendorListSchema } from '@/domain/scoped/vendor.schema';
import { NoteItem, NoteList, noteListSchema } from '@/domain/scoped/notes.schema';
import {
  KeyPeopleItem,
  KeyPeopleList,
  keyPeopleListSchema,
} from '@/domain/project/key-people.schema';
import { TagItem, TagList, tagListSchema } from '@/domain/scoped/tag.schema';
import {
  PhotoRequestItem,
  PhotoRequestList,
  photoRequestListSchema,
} from '@/domain/project/photo-request.schema';
// Couple Shot Repository
export const coupleShotRepository = new FirestoreListRepository<CoupleShotList, CoupleShotItem>({
  masterPath: MASTER_LIST_PATHS.COUPLE_SHOTS,
  userPath: USER_LIST_PATHS.COUPLE_SHOTS,
  projectPath: PROJECT_LIST_PATHS.COUPLE_SHOTS,
  listSchema: coupleShotListSchema as ZodSchema<CoupleShotList>,
  listType: ListType.COUPLE_SHOTS,
  serviceName: 'CoupleShotRepository',
});

// Group Shot Repository
export const groupShotRepository = new FirestoreListRepository<GroupShotList, GroupShotItem>({
  masterPath: MASTER_LIST_PATHS.GROUP_SHOTS,
  userPath: USER_LIST_PATHS.GROUP_SHOTS,
  projectPath: PROJECT_LIST_PATHS.GROUP_SHOTS,
  listSchema: groupShotListSchema as ZodSchema<GroupShotList>,
  listType: ListType.GROUP_SHOTS,
  serviceName: 'GroupShotRepository',
});

// Kit Repository
export const kitRepository = new FirestoreListRepository<KitList, KitItem>({
  masterPath: MASTER_LIST_PATHS.KIT,
  userPath: USER_LIST_PATHS.KIT,
  projectPath: PROJECT_LIST_PATHS.KIT,
  listSchema: kitListSchema as ZodSchema<KitList>,
  listType: ListType.KIT,
  serviceName: 'KitRepository',
});

// Task Repository
export const taskRepository = new FirestoreListRepository<TaskList, TaskItem>({
  masterPath: MASTER_LIST_PATHS.TASK,
  userPath: USER_LIST_PATHS.TASK,
  projectPath: PROJECT_LIST_PATHS.TASK,
  listSchema: taskListSchema as ZodSchema<TaskList>,
  listType: ListType.TASKS,
  serviceName: 'TaskRepository',
});

// Vendor Repository
export const vendorRepository = new FirestoreListRepository<VendorList, VendorItem>({
  masterPath: [],
  userPath: USER_LIST_PATHS.VENDORS,
  projectPath: PROJECT_LIST_PATHS.VENDORS,
  listSchema: vendorListSchema as ZodSchema<VendorList>,
  listType: ListType.VENDORS,
  serviceName: 'VendorRepository',
});

// Notes Repository
export const notesRepository = new FirestoreListRepository<NoteList, NoteItem>({
  masterPath: [],
  userPath: USER_LIST_PATHS.NOTES,
  projectPath: PROJECT_LIST_PATHS.NOTES,
  listSchema: noteListSchema as ZodSchema<NoteList>,
  listType: ListType.NOTES,
  serviceName: 'NotesRepository',
});

// Key People Repository
export const keyPeopleRepository = new FirestoreListRepository<KeyPeopleList, KeyPeopleItem>({
  masterPath: [],
  userPath: () => [],
  projectPath: PROJECT_LIST_PATHS.KEY_PEOPLE,
  listSchema: keyPeopleListSchema as ZodSchema<KeyPeopleList>,
  listType: ListType.KEY_PEOPLE,
  serviceName: 'KeyPeopleRepository',
});

// Photo Request Repository
export const photoRequestRepository = new FirestoreListRepository<
  PhotoRequestList,
  PhotoRequestItem
>({
  masterPath: [],
  userPath: () => [],
  projectPath: PROJECT_LIST_PATHS.PHOTO_REQUEST,
  listSchema: photoRequestListSchema as ZodSchema<PhotoRequestList>,
  listType: ListType.PHOTO_REQUEST,
  serviceName: 'PhotoRequestRepository',
});

// Tag Repository
export const tagRepository = new FirestoreListRepository<TagList, TagItem>({
  masterPath: [],
  userPath: USER_LIST_PATHS.TAGS,
  projectPath: PROJECT_LIST_PATHS.TAGS,
  listSchema: tagListSchema as ZodSchema<TagList>,
  listType: ListType.TAGS,
  serviceName: 'TagRepository',
});
