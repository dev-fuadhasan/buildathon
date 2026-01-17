/**
 * SIMPLIFIED RISK DETECTION SYSTEM
 * - No localStorage interference
 * - Cloud-only storage for dismissed risks
 * - Consistent across all devices
 */

import { RiskFactor, assessRisk } from "./riskPrediction";

export type RiskDetectionState = {
  profileRisks: RiskFactor[];
  symptomRisks: RiskFactor[];
  allRisks: RiskFactor[];
  dismissedRisks: Record<string, number>; // key -> timestamp when dismissed
  activeRisks: RiskFactor[]; // After filtering dismissed
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
};

/**
 * Generate unique key for a risk factor
 */
export function getRiskKey(factor: RiskFactor): string {
  return `${factor.category}:${factor.factor}`;
}

/**
 * Calculate risk state from profile and symptoms
 */
export function calculateRiskState(
  profile: any,
  symptomText: string,
  aiRisks: RiskFactor[],
  dismissedRisks: Record<string, number>,
  latestActivityTimestamp: number
): RiskDetectionState {
  // Get profile-based and symptom-based risks
  const assessment = assessRisk(profile, symptomText);
  
  // Separate profile vs symptom risks
  const profileRisks = assessment.riskFactors.filter(f => f.source === "profile");
  const symptomRisks = [...assessment.riskFactors.filter(f => f.source === "symptoms"), ...aiRisks];
  
  // Combine all risks
  const allRisks = [...profileRisks, ...symptomRisks];
  
  // Remove duplicates
  const uniqueRisks = new Map<string, RiskFactor>();
  allRisks.forEach(risk => {
    const key = getRiskKey(risk);
    if (!uniqueRisks.has(key)) {
      uniqueRisks.set(key, risk);
    }
  });
  
  // Filter out dismissed risks
  const activeRisks = Array.from(uniqueRisks.values()).filter(risk => {
    const key = getRiskKey(risk);
    const dismissedAt = dismissedRisks[key];
    
    // Profile risks: CANNOT be dismissed (locked)
    if (risk.source === "profile") {
      return true; // Always show profile risks
    }
    
    // Symptom/AI risks: if dismissed, stay dismissed
    if (dismissedAt) {
      console.log(`[Risk] ❌ Filtered dismissed risk: ${key} (dismissed at ${new Date(dismissedAt).toISOString()})`);
      return false;
    }
    
    // Not dismissed -> show it
    console.log(`[Risk] ✅ Showing active risk: ${key}`);
    return true;
  });
  
  // Calculate total risk score
  const riskScore = Math.min(
    activeRisks.reduce((sum, risk) => sum + (risk.points || 0), 0),
    100
  );
  
  // Determine risk level
  const riskLevel: "low" | "medium" | "high" = 
    riskScore >= 40 ? "high" : 
    riskScore >= 20 ? "medium" : 
    "low";
  
  return {
    profileRisks,
    symptomRisks,
    allRisks: Array.from(uniqueRisks.values()),
    dismissedRisks,
    activeRisks,
    riskScore,
    riskLevel,
  };
}

/**
 * Get latest activity timestamp from all sources
 */
export function getLatestActivityTimestamp(
  dailyEntries: any[],
  chatMessages: any[],
  consultationMessages: any[]
): number {
  const dailyTimes = dailyEntries.map(e => 
    new Date(e.updatedAt || e.createdAt).getTime()
  );
  
  const chatTimes = chatMessages
    .filter(m => m.role === "user")
    .map(m => new Date(m.timestamp).getTime());
  
  const consultTimes = consultationMessages
    .filter(m => m.senderRole === "mother")
    .map(m => new Date(m.createdAt).getTime());
  
  return Math.max(0, ...dailyTimes, ...chatTimes, ...consultTimes);
}
