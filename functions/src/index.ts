import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

// Instantiate Firestore Admin Client for managed Export/Import
const firestoreAdminClient = new admin.firestore.v1.FirestoreAdminClient();

/**
 * Daily Automated Firebase Cloud Function to backup Firestore transaction data.
 * Triggered automatically every 24 hours at 00:00 UTC (Midnight).
 * Exports all transactions and core collections to a dedicated Cloud Storage bucket.
 */
export const scheduledDailyFirestoreBackup = onSchedule(
  {
    schedule: "0 0 * * *", // Daily at midnight (00:00 UTC)
    timeZone: "UTC",
    retryCount: 3,
    memory: "512MiB",
  },
  async (event) => {
    const projectId =
      process.env.GCP_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      process.env.FIREBASE_PROJECT_ID ||
      "gen-lang-client-0259523664";

    const databaseName = firestoreAdminClient.databasePath(projectId, "(default)");

    // Dedicated GCS bucket for Firestore transaction backups
    const bucketName =
      process.env.BACKUP_BUCKET ||
      `gs://${projectId}-firestore-backups`;

    // Iso timestamp subfolder for daily snapshot versioning
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputUriPrefix = `${bucketName}/${timestamp}`;

    logger.info(`[DAILY BACKUP] Initiating Firestore export operation for project: ${projectId}`);
    logger.info(`[DAILY BACKUP] Target Cloud Storage Bucket URI: ${outputUriPrefix}`);

    try {
      const [operation] = await firestoreAdminClient.exportDocuments({
        name: databaseName,
        outputUriPrefix: outputUriPrefix,
        // Specific collections including transaction ledger, shifts, branch float, and debts
        collectionIds: [
          "transactions",
          "enakomoor_data",
          "shifts",
          "branches",
          "debts",
          "commissions"
        ],
      });

      logger.info(`[DAILY BACKUP] Firestore export job successfully launched. Operation ID: ${operation.name}`);
    } catch (error) {
      logger.error("[DAILY BACKUP] Error executing Firestore export operation:", error);
      throw error;
    }
  }
);
