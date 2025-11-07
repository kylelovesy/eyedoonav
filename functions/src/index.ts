import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';

// Initialize Firebase Admin
admin.initializeApp();

const firestore = admin.firestore();
const auth = admin.auth();

/**
 * Monitors new user documents and validates auth account exists
 * If auth account doesn't exist, delete the orphaned user document
 */
export const onUserDocumentCreated = onDocumentCreated('users/{userId}', async event => {
  const userId = event.params.userId;
  logger.info(`User document created: ${userId}`);

  try {
    // Check if auth account exists
    await auth.getUser(userId);
    logger.info(`Auth account confirmed for ${userId}`);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      // Auth account doesn't exist - delete orphaned document
      logger.error(`Auth account not found for ${userId}. Deleting orphaned document.`);

      try {
        await event.data?.ref.delete();
        logger.info(`Deleted orphaned user document: ${userId}`);
      } catch (deleteError) {
        logger.error(`Failed to delete orphaned document ${userId}:`, deleteError);
      }
    } else {
      logger.error(`Error checking auth account for ${userId}:`, error);
    }
  }
});

/**
 * Alternative: Use Firestore trigger to monitor user creation
 * and schedule cleanup of orphaned auth accounts
 */
export const scheduleAuthCleanup = onDocumentCreated('users/{userId}', async event => {
  const userId = event.params.userId;
  const userData = event.data?.data();

  if (!userData) {
    logger.warn(`No data in user document ${userId}`);
    return;
  }

  // Wait 30 seconds, then verify the document still exists and has valid data
  setTimeout(async () => {
    try {
      const docSnapshot = await firestore.collection('users').doc(userId).get();

      if (!docSnapshot.exists) {
        // Document was deleted - cleanup auth account
        logger.warn(`User document ${userId} was deleted. Cleaning up auth account.`);

        try {
          await auth.deleteUser(userId);
          logger.info(`Deleted auth account for deleted document: ${userId}`);
        } catch (error) {
          logger.error(`Failed to delete auth account ${userId}:`, error);
        }
      }
    } catch (error) {
      logger.error(`Error checking user document ${userId}:`, error);
    }
  }, 30000);
});

/**
 * Callable function to delete user data
 * Can be called from client with proper authentication
 */
export const deleteUserData = onCall(async request => {
  // Require authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated to delete user data');
  }

  const userId = request.data.userId || request.auth.uid;

  // Only allow users to delete their own data (unless admin)
  const isAdmin = request.auth.token.admin === true;
  if (userId !== request.auth.uid && !isAdmin) {
    throw new HttpsError('permission-denied', 'Cannot delete other users data');
  }

  try {
    logger.info(`Starting deletion for user: ${userId}`);

    // Delete user document
    await firestore.collection('users').doc(userId).delete();
    logger.info(`Deleted user document for ${userId}`);

    // Delete projects in batch
    const projectsSnapshot = await firestore
      .collection('projects')
      .where('userId', '==', userId)
      .get();

    if (!projectsSnapshot.empty) {
      const batch = firestore.batch();
      projectsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      logger.info(`Deleted ${projectsSnapshot.size} projects for user ${userId}`);
    }

    // Delete auth user (if admin or self-deletion)
    if (isAdmin || userId === request.auth.uid) {
      try {
        await auth.deleteUser(userId);
        logger.info(`Deleted auth account for ${userId}`);
      } catch (error) {
        logger.error(`Failed to delete auth account ${userId}:`, error);
      }
    }

    return {
      success: true,
      deletedProjects: projectsSnapshot.size,
    };
  } catch (error) {
    logger.error(`Error deleting user data for ${userId}:`, error);
    throw new HttpsError('internal', 'Failed to delete user data');
  }
});
