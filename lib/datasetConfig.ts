/**
 * Dataset Configuration for MomsCare
 * Controls which dataset mode to use
 */

export type DatasetMode = "AUTO" | "EN" | "BN";

/**
 * Get the current dataset mode from environment or use default
 */
export function getDatasetMode(): DatasetMode {
  const mode = process.env.DATASET_MODE?.toUpperCase() as DatasetMode;
  
  // Validate mode
  if (mode === "AUTO" || mode === "EN" || mode === "BN") {
    return mode;
  }
  
  // Default to AUTO (language detection)
  return "AUTO";
}

/**
 * Check if dataset mode is set to English only
 */
export function isEnglishOnly(): boolean {
  return getDatasetMode() === "EN";
}

/**
 * Check if dataset mode is set to Bangla only
 */
export function isBanglaOnly(): boolean {
  return getDatasetMode() === "BN";
}

/**
 * Check if dataset mode is set to AUTO (language detection)
 */
export function isAutoMode(): boolean {
  return getDatasetMode() === "AUTO";
}

/**
 * Force a specific language based on dataset mode
 * Returns the forced language or null if AUTO mode
 */
export function getForcedLanguage(): "en" | "bn" | null {
  const mode = getDatasetMode();
  
  if (mode === "EN") {
    return "en";
  } else if (mode === "BN") {
    return "bn";
  }
  
  return null; // AUTO mode
}

