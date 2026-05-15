import { registerJobHandler, enqueueJob, processPendingJobs, processJob } from "./scheduler"
import { SyncIntegrationJob } from "./sync-job"
import { AnalyzeChangeJob } from "./analyze-job"
import { GenerateDocumentJob } from "./generate-job"
import { SendNotificationJob } from "./notify-job"

// Enregistrer tous les handlers au démarrage
let initialized = false

export function initializeJobs(): void {
  if (initialized) return
  initialized = true

  registerJobHandler("SYNC_INTEGRATION", new SyncIntegrationJob())
  registerJobHandler("ANALYZE_CHANGE", new AnalyzeChangeJob())
  registerJobHandler("GENERATE_DOCUMENT", new GenerateDocumentJob())
  registerJobHandler("SEND_NOTIFICATION", new SendNotificationJob())

  console.log("[Jobs] Tous les handlers de jobs sont enregistrés")
}

export { enqueueJob, processPendingJobs, processJob }
export { SyncIntegrationJob } from "./sync-job"
export { AnalyzeChangeJob } from "./analyze-job"
export { GenerateDocumentJob } from "./generate-job"
export { SendNotificationJob } from "./notify-job"
