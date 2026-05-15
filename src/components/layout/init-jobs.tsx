import { initializeJobs } from "@/lib/jobs"

// Initialise les jobs au premier rendu
let initialized = false

export function InitJobs() {
  if (!initialized) {
    initialized = true
    initializeJobs()
  }
  return null
}
