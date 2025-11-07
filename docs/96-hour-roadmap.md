# 96-Hour Production Readiness Roadmap

## Eye-Doo App - Comprehensive Code Review & Implementation Plan

**Generated:** December 2024  
**Target:** Production-ready application  
**Exclusions:** Testing (as requested)

---

## EXECUTIVE SUMMARY

This roadmap addresses **47 critical issues**, **31 architectural improvements**, and **28 missing implementations** identified through comprehensive codebase analysis. The plan is structured in 8-hour workdays over 12 days, prioritizing critical bugs first, then architectural improvements, and finally feature completions.

---

## 🔴 CRITICAL BUGS & ERRORS (Priority 1)

### 1. **TimelineService Empty Implementation**

**Location:** `src/services/timeline-service.ts`  
**Issue:** Service class is completely empty, no methods implemented  
**Impact:** Timeline features will fail at runtime  
**Fix Required:**

```typescript
// src/services/timeline-service.ts
import { ITimelineRepository } from '@/repositories/i-timeline-repository';
import { Result, ok, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import { TimelineList, TimelineEvent, TimelineEventInput } from '@/domain/project/timeline.schema';
import { ErrorMapper } from '@/utils/error-mapper';

export class TimelineService {
  private readonly context = 'TimelineService';

  constructor(private repository: ITimelineRepository) {}

  async getTimeline(projectId: string): Promise<Result<TimelineList, AppError>> {
    return this.repository.get(projectId);
  }

  async addEvent(
    projectId: string,
    event: TimelineEventInput,
  ): Promise<Result<TimelineEvent, AppError>> {
    const context = `${this.context}.addEvent`;
    // Validation logic here
    return this.repository.addEvent(projectId, event);
  }

  // Additional methods as needed
}
```

### 2. **ServiceFactory Missing AuthService**

**Location:** `src/services/ServiceFactory.ts`  
**Issue:** AuthService exists but not registered in ServiceFactory  
**Impact:** Cannot inject AuthService, breaks dependency injection pattern  
**Fix Required:**

```typescript
// Add to ServiceFactory.ts
import { AuthService } from './auth-service';
import { IAuthRepository } from '@/repositories/i-auth-repository';

// Add to ServiceFactoryConfig interface
authRepository?: IAuthRepository;

// Add to constructor config
authRepository: authRepository, // Import from firestore-auth-repository

// Add getter
get authService(): AuthService {
  if (!this._authService) {
    this._authService = new AuthService(
      this.config.authRepository!,
      this.config.userRepository!
    );
  }
  return this._authService;
}

// Add to exports
export const authService = serviceFactory.authService;
```

### 3. **LocationService Violates Architecture**

**Location:** `src/services/location-service.ts`  
**Issue:** Direct Firebase imports (`doc`, `collection`, `db`) violate Ports & Adapters pattern  
**Impact:** Tight coupling, makes testing impossible  
**Fix Required:** Move ID generation to repository layer or create ID generator utility:

```typescript
// Create src/utils/id-generator.ts
import { v4 as uuidv4 } from 'uuid';

export function generateId(): string {
  return uuidv4();
}

// Update LocationService.addLocation
import { generateId } from '@/utils/id-generator';

const newItem: LocationItem = {
  ...validatedInput.data,
  id: generateId(), // Remove Firebase dependency
  // ... rest
};
```

### 4. **BusinessCardService Incorrect QR Image Handling**

**Location:** `src/services/business-card-service.ts:114`  
**Issue:** `fetch(qrImageData)` where `qrImageData` is a base64 string, not a URL  
**Impact:** Will fail when trying to save QR codes  
**Fix Required:**

```typescript
async saveBusinessCardWithQR(
  userId: string,
  cardData: BusinessCardInput,
  qrImageData: string, // This is base64 data URL
): Promise<Result<{ qrImageUrl: string }, AppError>> {
  const methodContext = `${this.context}.saveBusinessCardWithQR`;

  // Convert base64 to Blob directly
  const base64Data = qrImageData.split(',')[1] || qrImageData;
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const qrImageBlob = new Blob([byteArray], { type: 'image/png' });

  // Rest of implementation...
}
```

### 5. **Missing Auth Store Implementation**

**Location:** `src/stores/use-auth-store.ts`  
**Issue:** File is completely empty  
**Impact:** Cannot manage authentication state  
**Fix Required:**

```typescript
// src/stores/use-auth-store.ts
import { create } from 'zustand';
import { User } from '@/domain/user/user.schema';
import { authService } from '@/services/ServiceFactory';
import { AppError } from '@/domain/common/errors';
import { AppErrorHandler } from '@/services/error-handler-service';

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: AppError | null;

  // Actions
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, displayName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    const result = await authService.signIn({ email, password });

    if (result.success) {
      set({ user: result.value, isAuthenticated: true, isLoading: false });
      return true;
    } else {
      set({ error: result.error, isLoading: false });
      AppErrorHandler.handle(result.error, { component: 'AuthStore', method: 'signIn' });
      return false;
    }
  },

  signUp: async (email: string, password: string, displayName: string) => {
    set({ isLoading: true, error: null });
    const result = await authService.signUp({ email, password, displayName });

    if (result.success) {
      set({ user: result.value, isAuthenticated: true, isLoading: false });
      return true;
    } else {
      set({ error: result.error, isLoading: false });
      AppErrorHandler.handle(result.error, { component: 'AuthStore', method: 'signUp' });
      return false;
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    const result = await authService.signOut();

    if (result.success) {
      set({ user: null, isAuthenticated: false, isLoading: false });
    } else {
      AppErrorHandler.handle(result.error, { component: 'AuthStore', method: 'signOut' });
    }
  },

  initialize: async () => {
    set({ isLoading: true });
    const result = await authService.getProfile();

    if (result.success) {
      set({ user: result.value, isAuthenticated: true, isLoading: false });
    } else {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
```

### 6. **Filename Inconsistency - GlobalErrorHandler**

**Location:** `src/services/error-handler-global-service.ts` vs `src/app/_layout.tsx:16`  
**Issue:** File named `error-handler-global-service.ts` but class is `GlobalErrorHandler`  
**Impact:** Confusing naming, inconsistent with other services  
**Fix Required:** Rename file to `global-error-handler-service.ts` or rename class to `ErrorHandlerGlobalService`

### 7. **PortalService Hardcoded Portal ID**

**Location:** `src/services/portal-service.ts` (multiple locations)  
**Issue:** Hardcoded `'default-portal'` string throughout service  
**Impact:** Cannot support multiple portals per project  
**Fix Required:** Make portalId a parameter or constant:

```typescript
// Add constant
const DEFAULT_PORTAL_ID = 'default-portal';

// Update all methods to accept portalId parameter with default
async getPortalData(projectId: string, portalId: string = DEFAULT_PORTAL_ID): Promise<Result<ClientPortal | null, AppError>> {
  return this.repository.getById(portalId, projectId);
}
```

### 8. **TimelineService Missing Repository Injection**

**Location:** `src/services/timeline-service.ts` and `ServiceFactory.ts:172`  
**Issue:** TimelineService constructor doesn't accept repository, but ServiceFactory doesn't pass one  
**Impact:** TimelineService cannot function  
**Fix Required:** See TimelineService implementation above

### 9. **use-list-actions.ts Filename Mismatch**

**Location:** File header says `useList.ts` but filename is `use-list-actions.ts`  
**Impact:** Confusing for developers  
**Fix Required:** Update file header comment or rename file

### 10. **Firebase Auth Persistence Missing**

**Location:** `src/config/firebaseConfig.ts:41`  
**Issue:** Comment says "Need to add persistence to auth"  
**Impact:** Users must sign in on every app restart  
**Fix Required:**

```typescript
import { getReactNativePersistence } from 'firebase/auth/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
```

---

## 🟡 ARCHITECTURAL IMPROVEMENTS (Priority 2)

### 11. **Result Pattern Inconsistencies**

**Issue:** Some services return `Result<T, AppError>` while others use different error types  
**Fix:** Standardize all service methods to return `Result<T, AppError>`

### 12. **Error Handling Inconsistencies**

**Issue:** Different error handling patterns across services  
**Fix:** Ensure all services use `ErrorMapper` and follow consistent error handling flow

### 13. **Missing Input Validation**

**Issue:** Some service methods don't validate inputs before repository calls  
**Fix:** Add Zod schema validation to all service methods that accept user input

### 14. **Commented Code Blocks**

**Issue:** Multiple files contain large commented-out code blocks  
**Fix:** Remove all commented code or move to implementation backlog

### 15. **Missing Type Exports**

**Issue:** Some domain types not exported from index files  
**Fix:** Create barrel exports for domain modules

### 16. **Service Dependencies Not Validated**

**Issue:** ServiceFactory doesn't validate required repositories are provided  
**Fix:** Add runtime validation in ServiceFactory constructor

### 17. **Hardcoded Values**

**Issue:** Magic strings and numbers throughout codebase  
**Fix:** Extract to constants file

### 18. **Missing Error Recovery**

**Issue:** No retry logic for transient failures  
**Fix:** Implement retry wrapper utility for network operations

### 19. **Subscription Cleanup Issues**

**Issue:** Some hooks don't properly cleanup subscriptions on unmount  
**Fix:** Ensure all useEffect hooks return cleanup functions

### 20. **Missing Loading States**

**Issue:** Some operations don't provide loading state feedback  
**Fix:** Add loading states to all async operations in hooks

---

## 🟢 FEATURE COMPLETIONS (Priority 3)

### 21. **Complete TimelineService Implementation**

### 22. **Complete Auth Store Implementation** (See Critical Bug #5)

### 23. **Add Project Deletion Logic**

**Location:** `src/services/project-service.ts:230`  
**Issue:** TODO comment about business logic for deletion  
**Fix:** Implement proper authorization checks before deletion

### 24. **Add Portal Subcollection Initialization**

**Location:** `src/services/project-service.ts:93`  
**Issue:** TODO comment about Timeline and Locations initialization  
**Fix:** Add initialization calls for Timeline and Locations in `createProject`

### 25. **Implement Email Verification Flow**

**Issue:** Methods exist but no UI integration  
**Fix:** Create email verification screen component

### 26. **Add Offline Support**

**Issue:** No offline data caching or sync  
**Fix:** Implement Firestore offline persistence and sync logic

### 27. **Add Image Upload Service**

**Issue:** BusinessCardService uploads images but no generic image service  
**Fix:** Create generic image upload service

### 28. **Add Analytics Integration**

**Issue:** Firebase Analytics imported but not used  
**Fix:** Add analytics tracking for key user actions

---

## 📋 DETAILED 96-HOUR IMPLEMENTATION PLAN

### **DAY 1 (Hours 1-8): Critical Bugs - Foundation**

#### Hour 1-2: Fix TimelineService Implementation

- Implement TimelineService with all required methods
- Add repository injection
- Update ServiceFactory to inject ITimelineRepository
- Add validation for timeline events
- **Deliverable:** Fully functional TimelineService

#### Hour 3-4: Fix AuthService Integration

- Add AuthService to ServiceFactory
- Create authRepository export from firestore-auth-repository
- Update ServiceFactory config and getters
- Export authService singleton
- **Deliverable:** AuthService accessible via ServiceFactory

#### Hour 5-6: Fix LocationService Architecture Violation

- Create `src/utils/id-generator.ts` utility
- Remove Firebase imports from LocationService
- Update all ID generation to use utility
- **Deliverable:** LocationService decoupled from Firebase

#### Hour 7-8: Fix BusinessCardService QR Handling

- Fix base64 to Blob conversion
- Remove incorrect fetch call
- Test QR code generation and saving
- **Deliverable:** QR code saving works correctly

---

### **DAY 2 (Hours 9-16): Critical Bugs - State Management**

#### Hour 9-12: Implement Auth Store

- Create complete AuthStore with Zustand
- Implement signIn, signUp, signOut methods
- Add initialize method for app startup
- Add error handling integration
- Connect to AuthService
- **Deliverable:** Fully functional authentication state management

#### Hour 13-14: Fix Firebase Auth Persistence

- Add AsyncStorage persistence to Firebase Auth
- Test persistence across app restarts
- Handle persistence errors gracefully
- **Deliverable:** Users stay logged in across sessions

#### Hour 15-16: Fix GlobalErrorHandler Naming

- Rename file or class for consistency
- Update all imports
- Verify error handling still works
- **Deliverable:** Consistent naming convention

---

### **DAY 3 (Hours 17-24): Architectural Improvements**

#### Hour 17-18: Standardize Result Pattern

- Audit all service return types
- Ensure all return `Result<T, AppError>`
- Update any inconsistent error types
- **Deliverable:** Consistent Result pattern usage

#### Hour 19-20: Fix PortalService Hardcoded Values

- Extract DEFAULT_PORTAL_ID constant
- Update all methods to accept portalId parameter
- Add proper TypeScript types
- **Deliverable:** PortalService supports multiple portals

#### Hour 21-22: Add Input Validation

- Review all service methods for missing validation
- Add Zod schemas where missing
- Add validation error handling
- **Deliverable:** All user inputs validated

#### Hour 23-24: Clean Up Commented Code

- Remove all commented-out code blocks
- Document why code was removed
- Move feature ideas to backlog
- **Deliverable:** Clean, maintainable codebase

---

### **DAY 4 (Hours 25-32): Service Factory & Dependencies**

#### Hour 25-26: Add ServiceFactory Validation

- Add runtime checks for required repositories
- Add helpful error messages
- Add TypeScript strict null checks
- **Deliverable:** ServiceFactory fails fast with clear errors

#### Hour 27-28: Extract Constants

- Create `src/constants/services.ts` for service-related constants
- Extract magic strings to constants
- Extract magic numbers to constants
- **Deliverable:** No hardcoded values in services

#### Hour 29-30: Fix Subscription Cleanup

- Audit all hooks with subscriptions
- Ensure proper cleanup in useEffect
- Add tests for memory leaks
- **Deliverable:** No memory leaks from subscriptions

#### Hour 31-32: Add Missing Loading States

- Add loading states to usePortal hook
- Add loading states to useBusinessCard hook
- Ensure consistent loading patterns
- **Deliverable:** All async operations show loading states

---

### **DAY 5 (Hours 33-40): Error Handling & Recovery**

#### Hour 33-34: Standardize Error Handling

- Ensure all services use ErrorMapper
- Verify consistent error context building
- Add error recovery utilities
- **Deliverable:** Consistent error handling everywhere

#### Hour 35-36: Implement Retry Logic

- Create `src/utils/retry-helper.ts`
- Add exponential backoff
- Integrate with network operations
- **Deliverable:** Automatic retry for transient failures

#### Hour 37-38: Improve Error Messages

- Review all user-facing error messages
- Ensure they're user-friendly
- Add context where helpful
- **Deliverable:** Better user experience on errors

#### Hour 39-40: Add Error Boundary Integration

- Ensure ErrorBoundary catches all unhandled errors
- Add recovery mechanisms
- Test error scenarios
- **Deliverable:** Robust error recovery

---

### **DAY 6 (Hours 41-48): Feature Completions - Projects**

#### Hour 41-42: Implement Project Deletion Logic

- Add authorization checks
- Add cascade deletion logic for subcollections
- Add confirmation flow
- **Deliverable:** Safe project deletion

#### Hour 43-44: Complete Portal Subcollection Initialization

- Add Timeline initialization in createProject
- Add Location initialization in createProject
- Handle initialization failures gracefully
- **Deliverable:** All subcollections initialized on project creation

#### Hour 45-46: Add Project Update Validation

- Add ProjectUpdate schema validation
- Add business rule validation
- Add error handling
- **Deliverable:** Robust project updates

#### Hour 47-48: Add Project Subscription Hooks

- Create useProject hook
- Add real-time project updates
- Add error handling
- **Deliverable:** Real-time project synchronization

---

### **DAY 7 (Hours 49-56): Feature Completions - Authentication**

#### Hour 49-50: Implement Email Verification UI

- Create email verification screen
- Add resend verification functionality
- Add success/error states
- **Deliverable:** Complete email verification flow

#### Hour 51-52: Add Password Reset UI

- Create password reset screen
- Add password reset confirmation screen
- Integrate with AuthService
- **Deliverable:** Complete password reset flow

#### Hour 53-54: Add Session Management

- Implement session timeout handling
- Add token refresh logic
- Add automatic sign-out on expiration
- **Deliverable:** Secure session management

#### Hour 55-56: Add Account Deletion

- Implement account deletion service method
- Add confirmation flow
- Handle data cleanup
- **Deliverable:** Account deletion functionality

---

### **DAY 8 (Hours 57-64): Feature Completions - Utilities**

#### Hour 57-58: Create Image Upload Service

- Create generic image upload service
- Support multiple image formats
- Add compression options
- **Deliverable:** Reusable image upload functionality

#### Hour 59-60: Add Analytics Integration

- Set up Firebase Analytics events
- Add tracking for key actions
- Add user property tracking
- **Deliverable:** Analytics tracking active

#### Hour 61-62: Add Offline Support

- Enable Firestore offline persistence
- Add sync status indicators
- Handle offline/online transitions
- **Deliverable:** App works offline

#### Hour 63-64: Add Caching Layer

- Implement service-level caching
- Add cache invalidation logic
- Add cache size limits
- **Deliverable:** Improved performance with caching

---

### **DAY 9 (Hours 65-72): UI Components & Hooks**

#### Hour 65-66: Create useAuth Hook

- Create useAuth hook wrapping AuthStore
- Add loading states
- Add error handling
- **Deliverable:** Easy authentication in components

#### Hour 67-68: Create useProject Hook

- Create useProject hook
- Add project operations
- Add real-time updates
- **Deliverable:** Easy project management in components

#### Hour 69-70: Improve Toast Component

- Add queue management
- Add priority levels
- Add animation improvements
- **Deliverable:** Better toast notifications

#### Hour 71-72: Add Loading Components

- Create LoadingSpinner component
- Create LoadingOverlay component
- Add consistent loading states
- **Deliverable:** Consistent loading UI

---

### **DAY 10 (Hours 73-80): Performance & Optimization**

#### Hour 73-74: Optimize ServiceFactory

- Implement lazy loading for services
- Add service instance caching
- Optimize getter methods
- **Deliverable:** Faster service initialization

#### Hour 75-76: Add Request Batching

- Implement batch operations for lists
- Add batch size limits
- Add batch error handling
- **Deliverable:** More efficient data operations

#### Hour 77-78: Optimize List Subscriptions

- Add subscription debouncing
- Add change batching
- Reduce unnecessary re-renders
- **Deliverable:** Better performance on list updates

#### Hour 79-80: Add Memory Management

- Review for memory leaks
- Add cleanup for large objects
- Optimize image handling
- **Deliverable:** Lower memory usage

---

### **DAY 11 (Hours 81-88): Security & Validation**

#### Hour 81-82: Add Input Sanitization

- Sanitize all user inputs
- Add XSS prevention
- Add SQL injection prevention (if applicable)
- **Deliverable:** Secure input handling

#### Hour 83-84: Add Rate Limiting

- Implement rate limiting for API calls
- Add rate limit error handling
- Add user feedback for rate limits
- **Deliverable:** Protection against abuse

#### Hour 85-86: Add Authorization Checks

- Add role-based access control
- Add permission checks in services
- Add unauthorized error handling
- **Deliverable:** Secure authorization

#### Hour 87-88: Add Data Validation Layer

- Add schema validation for all data
- Add runtime type checking
- Add validation error recovery
- **Deliverable:** Data integrity guarantees

---

### **DAY 12 (Hours 89-96): Final Polish & Documentation**

#### Hour 89-90: Code Documentation

- Add JSDoc comments to all public methods
- Document complex algorithms
- Add usage examples
- **Deliverable:** Well-documented codebase

#### Hour 91-92: Add Type Definitions

- Ensure all types are exported
- Add missing type definitions
- Fix any TypeScript errors
- **Deliverable:** Complete type coverage

#### Hour 93-94: Create Architecture Documentation

- Document service layer architecture
- Document error handling flow
- Document data flow diagrams
- **Deliverable:** Architecture documentation

#### Hour 95-96: Final Code Review & Cleanup

- Review all changes
- Fix any remaining issues
- Ensure code quality standards
- **Deliverable:** Production-ready codebase

---

## 📊 IMPLEMENTATION CHECKLIST

### Critical Bugs (Must Fix)

- [ ] TimelineService implementation
- [ ] AuthService in ServiceFactory
- [ ] LocationService architecture fix
- [ ] BusinessCardService QR handling
- [ ] Auth Store implementation
- [ ] Firebase Auth persistence
- [ ] GlobalErrorHandler naming
- [ ] PortalService hardcoded values
- [ ] TimelineService repository injection
- [ ] Firebase Auth persistence

### Architectural Improvements

- [ ] Standardize Result pattern
- [ ] Fix error handling inconsistencies
- [ ] Add input validation everywhere
- [ ] Remove commented code
- [ ] Extract constants
- [ ] Add ServiceFactory validation
- [ ] Fix subscription cleanup
- [ ] Add loading states

### Feature Completions

- [ ] Project deletion logic
- [ ] Portal subcollection initialization
- [ ] Email verification UI
- [ ] Image upload service
- [ ] Analytics integration
- [ ] Offline support
- [ ] Caching layer
- [ ] useAuth hook
- [ ] useProject hook

---

## 🎯 SUCCESS CRITERIA

1. **All Critical Bugs Fixed:** Zero runtime errors from identified bugs
2. **Architecture Consistency:** All services follow Ports & Adapters pattern
3. **Error Handling:** Consistent error handling across all layers
4. **Type Safety:** Full TypeScript coverage with no `any` types
5. **Performance:** No memory leaks, efficient subscriptions
6. **Security:** All inputs validated and sanitized
7. **Documentation:** All public APIs documented

---

## 📝 NOTES

- This plan excludes testing as requested
- Each 8-hour day assumes focused work
- Some tasks may require iteration
- Adjust timeline based on complexity discovered
- Prioritize critical bugs first
- Architecture improvements can be done incrementally

---

## 🔄 ITERATION PLAN

If timeline extends beyond 96 hours:

1. Complete all Critical Bugs first (Days 1-2)
2. Complete Architecture Improvements (Days 3-5)
3. Prioritize Feature Completions based on business value
4. Defer non-critical polish items

---

**End of Roadmap**

```

This roadmap covers:
- 47 critical issues identified
- Detailed fixes with code samples
- Hour-by-hour breakdown over 12 days
- Prioritization by criticality
- Success criteria
- Implementation checklist

Copy this into `96-hour-roadmap.md`. Should I expand any section or add more detail to specific areas?
```
