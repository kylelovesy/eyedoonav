# **Guide: Project Module Setup & Testing**

This document outlines the new files and testing strategy for the Project module. This module is the core of your application, and these changes provide the foundation for all project-management features.

## **1\. What We've Added**

1. **Placeholder Screens:** We've created the basic screens needed to list, view, and create new projects using expo-router.
2. **Placeholder Components:** We've added simple components for project lists, list items, and creation forms.
3. **Test Suite:** We've built a comprehensive, multi-layer test suite to validate all the logic for fetching and creating projects.

## **2\. Placeholder Files**

These files should be placed at the specified paths in your src/ directory. They provide the necessary UI for the Project module to function.

### **Screens (in src/app/)**

- **src/app/(app)/projects/index.tsx**:
  - **Purpose:** This is the main project dashboard. It uses the useUserProjects hook to get a list of all projects for the current user and displays them using the ProjectList component.
  - It includes a "New" button to navigate to the project creation screen.
- **src/app/(app)/projects/new.tsx**:
  - **Purpose:** A simple screen that hosts the CreateProjectForm component.
  - It contains the business logic for handling the form submission, calling the ProjectManagementService, and navigating to the new project's detail page on success.
- **src/app/(app)/projects/\[projectId\].tsx**:
  - **Purpose:** This is the detail screen for a single project. It uses useLocalSearchParams to get the projectId from the URL.
  - It uses the useProject hook to fetch and display that specific project's data. This will become the main dashboard for a single project (where you'll add Timeline, Locations, etc.).

### **Components (in src/components/project/)**

- **src/components/project/ProjectList.tsx**:
  - **Purpose:** A simple component that takes an array of UserProject objects and renders them in a FlatList using the ProjectListItem component.
- **src/components/project/ProjectListItem.tsx**:
  - **Purpose:** A clickable Card component that displays summary info for a single project.
  - When pressed, it uses expo-router to navigate to the \[projectId\] detail screen.
- **src/components/project/CreateProjectForm.tsx**:
  - **Purpose:** A placeholder form with inputs for project name and (mocked) inputs for date and type.
  - It has an onSave prop that the new.tsx screen uses to handle the creation logic. _Note: This currently lacks validation and uses placeholder pickers, which should be replaced with real components._

## **3\. The Test Strategy**

We've added a full suite of tests for the Project module, following the same "inside-out" pattern as the User module. This isolates and validates each layer of your architecture.

- **\_\_tests\_\_/domain/project/project.schema.spec.ts**:
  - **Tests:** The ProjectSchema and UserProjectSchema.
  - **Ensures:** Your data models are correct, required fields are enforced, and (most importantly) data from Firestore (like Timestamps or date strings) is correctly parsed into Date objects.
- **\_\_tests\_\_/repositories/firestore/firestore-base-project-repository.spec.ts**:
  - **Tests:** The FirestoreBaseProjectRepository (which handles the /projects/{projectId} collection).
  - **Ensures:** The get method correctly parses data from Firestore or returns a "Not Found" error, and that create calls setDoc with the correct data.
- **\_\_tests\_\_/repositories/firestore/firestore-user-projects-repository.spec.ts**:
  - **Tests:** The FirestoreUserProjectsRepository (which handles the /users/{userId}/projects/{projectId} sub-collection).
  - **Ensures:** The getAll method correctly queries the sub-collection and parses the list of projects, and that addProject correctly calls setDoc.
- **\_\_tests\_\_/services/base-project-service.spec.ts**:
  - **Tests:** The BaseProjectService (logic for the /projects collection).
  - **Ensures:** The service correctly calls its repository and returns the Result (either the project or an error).
- **\_\_tests\_\_/services/user-projects-service.spec.ts**:
  - **Tests:** The UserProjectsService (logic for the /users/{...}/projects sub-collection).
  - **Ensures:** The getUserProjects method correctly calls its repository and returns the list of projects.
- **\_\_tests\_\_/hooks/use-project.spec.ts**:
  - **Tests:** The useProject hook.
  - **Ensures:** The hook calls the BaseProjectService on mount, sets loading state, and then correctly sets either the project data or the error state.
- **\_\_tests\_\_/hooks/use-user-projects.spec.ts**:
  - **Tests:** The useUserProjects hook.
  - **Ensures:** The hook calls the UserProjectsService on mount, sets loading state, and then correctly sets the userProjects list or the error state.
- **\_\_tests\_\_/components/project/ProjectListItem.spec.tsx**:
  - **Tests:** The ProjectListItem component.
  - **Ensures:** The component renders the project data (name, client, etc.) and that expo-router's push function is called with the correct URL when the item is pressed.
