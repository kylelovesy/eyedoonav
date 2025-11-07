# Firestore Security Rules

Complete Firestore security rules for the Eye-Doo application, covering all collections and access patterns.

## Overview

These rules implement role-based access control for:
- **Users**: Individual user data (profiles, preferences, lists)
- **Projects**: Collaborative project data between photographers and clients
- **Master Data**: Read-only reference data

## Access Patterns

### User Data
- **Owner Access**: Users can only access their own data
- **Collections**: profile, preferences, customizations, subscription, setup, projects, lists

### Project Data
- **Collaborative Access**: Both photographer and client can read/write project data
- **Photographer Control**: Only photographer can create/update/delete projects
- **Collections**: projects, lists, locations, timeline, vendors

### Master Data
- **Read-Only**: Authenticated users can read, only system functions can write
- **Collections**: masterData (kit lists, task lists, etc.)

## Complete Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    // Check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Check if user owns a document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Check if user is photographer for a project
    function isPhotographer(userId, projectId) {
      return exists(/databases/$(database)/documents/projects/$(projectId)) &&
             get(/databases/$(database)/documents/projects/$(projectId)).data.photographerId == userId;
    }

    // Check if user is client for a project
    function isClient(userId, projectId) {
      return exists(/databases/$(database)/documents/projects/$(projectId)) &&
             get(/databases/$(database)/documents/projects/$(projectId)).data.clientId == userId;
    }

    // Check if user has access to a project (either photographer or client)
    function hasProjectAccess(userId, projectId) {
      return isPhotographer(userId, projectId) || isClient(userId, projectId);
    }

    // ============================================================================
    // USERS COLLECTION
    // ============================================================================

    // User profile data - only owner can access
    match /users/{userId}/profile/{document=**} {
      allow read, write: if isOwner(userId);
    }

    // User preferences - only owner can access
    match /users/{userId}/preferences/{document=**} {
      allow read, write: if isOwner(userId);
    }

    // User customizations - only owner can access
    match /users/{userId}/customizations/{document=**} {
      allow read, write: if isOwner(userId);
    }

    // User subscription - only owner can access
    match /users/{userId}/subscription/{document=**} {
      allow read, write: if isOwner(userId);
    }

    // User setup data - only owner can access
    match /users/{userId}/setup/{document=**} {
      allow read, write: if isOwner(userId);
    }

    // User projects list - only owner can access
    match /users/{userId}/projects/{document=**} {
      allow read, write: if isOwner(userId);
    }

    // User lists (global scope) - only owner can access
    match /users/{userId}/lists/{listType} {
      allow read, write: if isOwner(userId);
    }

    // User vendors data - only owner can access
    match /users/{userId}/vendors/{document=**} {
      allow read, write: if isOwner(userId);
    }

    // ============================================================================
    // PROJECTS COLLECTION
    // ============================================================================

    // Project documents - photographer and client can read, only photographer can write
    match /projects/{projectId} {
      allow read: if hasProjectAccess(request.auth.uid, projectId);
      allow create: if isAuthenticated() && request.auth.uid == resource.data.photographerId;
      allow update: if isPhotographer(request.auth.uid, projectId);
      allow delete: if isPhotographer(request.auth.uid, projectId);
    }

    // Project lists - both photographer and client can read/write for collaboration
    match /projects/{projectId}/lists/{listType} {
      allow read, write: if hasProjectAccess(request.auth.uid, projectId);
    }

    // Project locations - both photographer and client can read/write
    match /projects/{projectId}/locations/{document=**} {
      allow read, write: if hasProjectAccess(request.auth.uid, projectId);
    }

    // Project timeline - both photographer and client can read/write
    match /projects/{projectId}/timeline/{document=**} {
      allow read, write: if hasProjectAccess(request.auth.uid, projectId);
    }

    // Project vendors - both photographer and client can read/write
    match /projects/{projectId}/vendors/{document=**} {
      allow read, write: if hasProjectAccess(request.auth.uid, projectId);
    }

    // ============================================================================
    // MASTER DATA COLLECTION
    // ============================================================================

    // Master lists - authenticated users can read, only system can write
    match /masterData/{listType} {
      allow read: if isAuthenticated();
      allow write: if false; // Only system functions can write master data
    }

    // ============================================================================
    // AUTHENTICATION REQUIRED FOR ALL OPERATIONS
    // ============================================================================

    // Deny all operations for unauthenticated users
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Data Structure

### User Collections
```
users/{userId}/
├── profile/{profileId}
├── preferences/{preferencesId}
├── customizations/{customizationsId}
├── subscription/{subscriptionId}
├── setup/{setupId}
├── projects/{projectId} (references)
├── lists/
│   ├── notes
│   ├── kitList
│   ├── taskList
│   └── ...
└── vendors/data
```

### Project Collections
```
projects/{projectId}/
├── {projectDocument}
├── lists/
│   ├── notes
│   ├── kitList
│   ├── taskList
│   ├── photoRequests
│   ├── keyPeople
│   └── ...
├── locations/data
├── timeline/data
└── vendors/data
```

### Master Data Collections
```
masterData/
├── kit
├── task
├── groupShots
└── coupleShots
```

## Deployment

To deploy these rules:

```bash
firebase deploy --only firestore:rules
```

## Testing

Test these rules using the Firebase emulator:

```bash
firebase emulators:start --only firestore
```

Use the Firebase Rules Playground or write unit tests for complex access patterns.
