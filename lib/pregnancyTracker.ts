/**
 * Pregnancy Progress Tracker
 * Handles automatic daily increment of pregnancy days based on timezone
 */

import { MotherProfile, getMother, saveMother } from "./data";

import { detectTimezoneFromAddress } from "./timezoneDetector";

/**
 * Detects timezone from address or uses default
 * @deprecated Use detectTimezoneFromIP for better accuracy
 */
export function detectTimezone(address?: string): string {
  return detectTimezoneFromAddress(address);
}

/**
 * Gets current date in a specific timezone
 */
export function getCurrentDateInTimezone(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

/**
 * Gets current time in a specific timezone
 */
export function getCurrentTimeInTimezone(timezone: string): { hour: number; minute: number } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
  return { hour, minute };
}

/**
 * Calculates days pregnant from due date or LMP
 */
export function calculateDaysPregnant(dueDate?: string, weeksPregnant?: number): number | undefined {
  if (dueDate) {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // Full term is 280 days, so days pregnant = 280 - days until due
    return Math.max(0, 280 - diffDays);
  }
  
  if (weeksPregnant) {
    return weeksPregnant * 7;
  }
  
  return undefined;
}

/**
 * Auto-increments pregnancy days if needed
 * Only increments at 12:00 AM local time
 */
export async function updatePregnancyProgress(motherId: string, timezone?: string): Promise<void> {
  try {
    const mother = await getMother(motherId);
    if (!mother) return;
    
    const tz = timezone || mother.timezone || detectTimezone(mother.address);
    const today = getCurrentDateInTimezone(tz);
    const { hour, minute } = getCurrentTimeInTimezone(tz);
    
    // Only update at 12:00 AM (midnight) - hour 0 and minute 0-5 (5 minute window)
    // This ensures the day increments at the start of the new day
    if (hour !== 0 || minute > 5) {
      // Not midnight yet, skip update
      return;
    }
    
    // If we already updated today, skip
    if (mother.lastPregnancyDayUpdate === today) {
      return;
    }
    
    // Calculate current days pregnant
    let daysPregnant = mother.daysPregnant;
    
    if (!daysPregnant) {
      // Initialize from weeks or due date
      daysPregnant = calculateDaysPregnant(mother.dueDate, mother.weeksPregnant);
    }
    
    if (daysPregnant !== undefined && daysPregnant < 280) {
      // Increment by 1 day
      daysPregnant += 1;
      
      // Update profile
      const updated: MotherProfile = {
        ...mother,
        daysPregnant,
        weeksPregnant: Math.floor(daysPregnant / 7), // Keep weeks for compatibility
        lastPregnancyDayUpdate: today,
        timezone: tz,
        updatedAt: new Date().toISOString(),
      };
      
      await saveMother(updated);
    }
  } catch (err) {
    console.error("Error updating pregnancy progress:", err);
  }
}

/**
 * Converts days to weeks and days
 */
export function formatPregnancyProgress(days: number): { weeks: number; days: number; display: string } {
  const weeks = Math.floor(days / 7);
  const remainingDays = days % 7;
  return {
    weeks,
    days: remainingDays,
    display: `${weeks} weeks ${remainingDays} days`,
  };
}

