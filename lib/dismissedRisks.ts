/**
 * ULTRA-SIMPLE DISMISSED RISKS STORAGE
 * Separate from profile to avoid consistency issues
 */

import { getJson, putJson } from "./r2Client";

function dismissedRisksKey(motherId: string): string {
  return `dismissed-risks/${motherId}.json`;
}

export async function getDismissedRisks(motherId: string): Promise<Record<string, number>> {
  try {
    const data = await getJson<Record<string, number>>(dismissedRisksKey(motherId));
    return data || {};
  } catch (err) {
    console.error("[DismissedRisks] Load error:", err);
    return {};
  }
}

export async function saveDismissedRisks(motherId: string, dismissed: Record<string, number>): Promise<void> {
  try {
    await putJson(dismissedRisksKey(motherId), dismissed);
    console.log("[DismissedRisks] Saved:", { motherId, count: Object.keys(dismissed).length });
  } catch (err) {
    console.error("[DismissedRisks] Save error:", err);
    throw err;
  }
}
