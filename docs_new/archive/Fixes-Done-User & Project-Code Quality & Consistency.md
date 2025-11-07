# **Code Quality & Consistency Report: User & Project Modules**

This report provides a detailed review of the User and Project modules, focusing on code inconsistencies, error handling, validation, and sanitization.

Your project has a strong architectural foundation (Schema \-\> Repository \-\> Service \-\> Hook), which is excellent. The issues flagged below are common refinements to make this pattern more robust and resilient.

## **User Module Review**

### **1\. Schemas (Validation & Sanitization)**

Your Zod schemas are the most critical layer for ensuring data integrity.

- **Issue Type:** **Sanitization (Critical)**
- **Problem:** Optional string fields are defined with z.string().optional(). This means if the field is not provided, its value is undefined. As we discovered, Firestore **does not support undefined values** (Function setDoc() called with invalid data).
- **Files Affected:**
  - src/domain/user/user.schema.ts (BaseUserSchema \-\> phone)
  - src/domain/user/user.schema.ts (UserProfileSchema \-\> bio, website)
  - src/domain/user/business-card.schema.ts (BusinessCardSchema \-\> email, phone, website, bio)
- Recommendation:  
  Change all optional string/number/boolean fields to be nullable and default to null. This sanitizes the data at the schema level, guaranteeing you never send undefined to Firestore.  
  **Example (BaseUserSchema):**  
  // Before  
  phone: z.string().optional(),

  // After (The Fix)  
  phone: z.string().nullable().default(null).optional(),

  **Example (BusinessCardSchema):**  
  // Before  
  socialLinks: z.array(SocialLinkSchema), // Will be undefined if not provided

  // After  
  socialLinks: z.array(SocialLinkSchema).default(\[\]), // Guarantees an array

### **2\. Repositories (Error Handling & Validation)**

Your repositories are responsible for data access and parsing.

- **Issue Type:** **Error Handling (Medium)**
- **Problem:** In your get methods, the try...catch block around Schema.parse() is too generic. If Zod parsing fails (due to bad data in the DB), it returns a generic DB*001 error. This makes debugging very difficult, as you don't know \_what* was wrong with the data.
- **Files Affected:**
  - src/repositories/firestore/firestore-base-user-repository.ts (in get)
  - src/repositories/firestore/firestore-user-profile-repository.ts (in get)
  - src/repositories/firestore/firestore-business-card-repository.ts (in get)
- Recommendation:  
  Specifically catch ZodError and return a DB_004 (Validation Error) that includes the parsing issues.  
  **Example (firestore-base-user-repository.ts):**  
  // Inside get()  
  try {  
   // ... getDoc logic ...  
   if (\!docSnap.exists()) {  
   return err(new AppError('DB_002', 'User document not found.'));  
   }

  const data \= docSnap.data();  
   const user \= BaseUserSchema.parse(data); // Parse the data  
   return ok(user);

  } catch (error) {  
   // \--- START FIX \---  
   if (error instanceof z.ZodError) {  
   console.error('\[Repo\] Failed to parse user data:', error.issues);  
   return err(  
   new AppError('DB_004', 'Failed to validate user data.', error.issues)  
   );  
   }  
   // \--- END FIX \---

  console.error('\[Repo\] Generic error getting user:', error);  
   return err(this.errorHandler.handle(error, 'Failed to get user.'));  
  }

- **Issue Type:** **Sanitization (Low)**
- **Problem:** The update methods take a Partial\<T\> and pass it directly to updateDoc. If the partial object contains an undefined value (e.g., { phone: undefined }), it can cause issues.
- **Files Affected:** All repositories with an update method.
- Recommendation:  
  Create a simple helper utility to strip undefined keys from any object before sending it to updateDoc.  
  **Example (in src/utils/sanitization-helpers.ts):**  
  /\*\*  
   \* Removes keys with 'undefined' values from an object.  
   \* Firestore updateDoc errors with 'undefined', but 'null' is fine.  
   \*/  
  export const removeUndefinedValues \= \<T extends object\>(obj: T): Partial\<T\> \=\> {  
   const newObj: Partial\<T\> \= {};  
   for (const key in obj) {  
   if (obj\[key\] \!== undefined) {  
   newObj\[key\] \= obj\[key\];  
   }  
   }  
   return newObj;  
  };

  **Example (in firestore-base-user-repository.ts):**  
  // Inside update()  
  try {  
   const userDocRef \= doc(this.db, this.paths.user(userId));

  // \--- START FIX \---  
   const sanitizedData \= removeUndefinedValues(data);  
   await updateDoc(userDocRef, sanitizedData);  
   // \--- END FIX \---

  return ok(undefined);  
  } //...

### **3\. Hooks (Type Consistency)**

- **Issue Type:** **Type Consistency (Low)**
- **Problem:** Hooks that fetch lists (use-user-projects.ts) initialize their state with useState\<UserProject\[\] | null\>(null). This forces every component that uses the hook to check for null. A list that is "loading" or "has no items" is better represented by an empty array \[\].
- **Files Affected:**
  - src/hooks/use-user-projects.ts
  - (Likely any other list-based hooks)
- Recommendation:  
  Initialize list state to an empty array.  
  **Example (use-user-projects.ts):**  
  // Before  
  const \[userProjects, setUserProjects\] \= useState\<UserProject\[\] | null\>(null);

  // After  
  const \[userProjects, setUserProjects\] \= useState\<UserProject\[\]\>(\[\]);

  This simplifies your component logic: userProjects.length \=== 0 now covers loading, empty, and error states, and you only need to check status to differentiate.

## **Project Module Review**

### **1\. Schemas (Validation & Type Error)**

- **Issue Type:** **Validation / Type Error (Critical)**
- **Problem:** Your ProjectSchema defines date, createdAt, and updatedAt as z.date(). However, Firestore **does not store Date objects**. It stores Timestamp objects. When you fetch data, doc.data() will return { date: Timestamp(...) }, and ProjectSchema.parse() will fail because a Timestamp is not a Date.
- **Files Affected:**
  - src/domain/project/project.schema.ts
- Recommendation:  
  Use z.preprocess to safely convert Firestore Timestamps (and date strings, for good measure) into Date objects before Zod validates them.  
  **Example (project.schema.ts):**  
  import { z } from 'zod';  
  // Import Timestamp type from Firestore  
  import { Timestamp } from 'firebase/firestore';

  // \--- START FIX \---  
  /\*\*  
   \* Preprocessor to safely convert Firestore Timestamps,  
   \* date strings, or existing Date objects into a Date.  
   \*/  
  const dateSchema \= z.preprocess((arg) \=\> {  
   if (arg instanceof Timestamp) {  
   return arg.toDate();  
   }  
   if (typeof arg \=== 'string' || arg instanceof Date) {  
   try {  
   return new Date(arg);  
   } catch (e) {  
   return arg; // Let zod handle the invalid date error  
   }  
   }  
   if (arg && typeof (arg as any).toDate \=== 'function') {  
   // Handle potential "mock" Timestamps or other custom objects  
   return (arg as any).toDate();  
   }  
   return arg;  
  }, z.date());  
  // \--- END FIX \---

  export const ProjectSchema \= z.object({  
   id: z.string(),  
   name: z.string(),  
   // ...

  // Use the new preprocessor  
   date: dateSchema,  
   createdAt: dateSchema,  
   updatedAt: dateSchema,  
  });

  _Apply this dateSchema to UserProjectSchema as well._

### **2\. Repositories (Error Handling)**

- **Issue Type:** **Error Handling (Medium)**
- **Problem:** Same as the User repositories. The get method in firestore-base-project-repository.ts will throw a generic DB*001 error on a Zod parsing fail (which is now \_guaranteed* to happen because of the Timestamp issue above).
- **Recommendation:** Apply the same try...catch (error instanceof z.ZodError) fix as recommended for the User repositories.
- **Issue Type:** **Error Handling / Resilience (Medium)**
- **Problem:** In firestore-user-projects-repository.ts, the getAll method fetches a list of projects. It maps over the docs and parses them inside a try...catch. If a _single document_ in the list is invalid and fails parsing, the _entire function fails_.
- **Files Affected:**
  - src/repositories/firestore/firestore-user-projects-repository.ts (in getAll)
- Recommendation:  
  Make the parsing resilient. Use safeParse for each document, log any individual failures, and return only the projects that successfully parsed.  
  **Example (firestore-user-projects-repository.ts):**  
  // Inside getAll()  
  try {  
   // ... query logic ...  
   const querySnapshot \= await getDocs(q);

  // \--- START FIX \---  
   const projects: UserProject\[\] \= \[\];  
   querySnapshot.docs.forEach((doc) \=\> {  
   const result \= UserProjectSchema.safeParse(doc.data());

      if (result.success) {
        projects.push(result.data as UserProject);
      } else {
        // Log the bad document but don't fail the whole request
        console.warn(
          \`\[Repo\] Failed to parse user project ${doc.id} for user ${userId}:\`,
          result.error.issues
        );
      }

  });  
   return ok(projects);  
   // \--- END FIX \---

  } catch (error) {  
   // ... generic error handling ...  
  }

### **3\. Services (Consistency)**

- **Issue Type:** **Consistency (Critical)**
- **Problem:** In src/services/ProjectManagementService.ts, the createNewProject method performs two separate "write" operations:
  1. baseProjectRepo.create (creates the main project)
  2. userProjectsRepo.addProject (links it to the user)  
     These are not in a transaction. If step 1 succeeds but step 2 fails (e.g., user permissions, network error), you will have an "orphaned" project in your database that no user is linked to.
- **Files Affected:**
  - src/services/ProjectManagementService.ts
- Recommendation:  
   Use a Firestore runTransaction to make this an "all or nothing" atomic operation. This requires modifying your repositories slightly to accept a Transaction object.  
   **Step 1: Update Repository Interfaces (e.g., i-base-project-repository.ts)**  
   import { Transaction } from 'firebase/firestore';

  export interface IBaseProjectRepository {  
   // Add 'tx?: Transaction' to write methods  
   create(projectId: string, data: Project, tx?: Transaction): Promise\<Result\<void, AppError\>\>;  
   // ...  
   }

  **Step 2: Update Repository Implementation (e.g., firestore-base-project-repository.ts)**  
   // Inside create()  
   public async create(  
   projectId: string,  
   data: Project,  
   tx?: Transaction  
   ): Promise\<Result\<void, AppError\>\> {  
   try {  
   const projectDocRef \= doc(this.db, this.paths.project(projectId));  
   if (tx) {  
   tx.set(projectDocRef, data); // Use transaction 'set'  
   } else {  
   await setDoc(projectDocRef, data); // Use normal 'setDoc'  
   }  
   return ok(undefined);  
   } //...  
   }
  (Do this for IUserProjectsRepository.addProject as well)

**Step 3: Update the Service (`ProjectManagementService.ts`)**

```typescript
import { runTransaction, getFirestore } from 'firebase/firestore'; // Import

export class ProjectManagementService {
  // ... constructor ...

  // Add this to get the db instance
  private db = getFirestore();

  public async createNewProject(...) {
    // ... generate IDs and create objects ...

    try {
      // --- START FIX ---
      await runTransaction(this.db, async (transaction) => {
        // Pass the transaction 'tx' to the repository methods
        const projectResult = await this.baseProjectRepo.create(
          project.id,
          project,
          transaction
        );
        if (projectResult.isErr()) throw projectResult.unwrapErr(); // Abort transaction

        const userProjectResult = await this.userProjectsRepo.addProject(
          userId,
          project.id,
          userProject,
          transaction
        );
        if (userProjectResult.isErr()) throw userProjectResult.unwrapErr(); // Abort transaction
      });
      // --- END FIX ---

      return ok({ id: project.id });

    } catch (error) {
      return err(this.errorHandler.handle(error, 'Failed to create project.'));
    }
  }
}
```
