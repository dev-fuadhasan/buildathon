/**
 * AI-based hospital/clinic name matching
 * Uses AI to check if a hospital name matches existing ones
 */

import { groq, isGroqConfigured } from "./groqClient";

/**
 * Normalizes a hospital/clinic name for matching
 * Removes common variations, extra spaces, etc.
 */
export function normalizeHospitalName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ") // Multiple spaces to single space
    .replace(/[^\w\s]/g, "") // Remove special characters
    .replace(/\b(hospital|clinic|medical|center|centre|healthcare|health)\b/gi, "") // Remove common words
    .trim();
}

/**
 * Uses AI to check if two hospital names are the same
 * Returns the matched hospital name if found, or null
 */
export async function findMatchingHospitalName(
  newName: string,
  existingNames: string[]
): Promise<string | null> {
  if (!isGroqConfigured()) {
    // Fallback to simple matching if AI not available
    return simpleMatch(newName, existingNames);
  }

  if (existingNames.length === 0) {
    return null;
  }

  try {
    const normalizedNew = normalizeHospitalName(newName);
    
    // First try simple normalized matching
    for (const existing of existingNames) {
      const normalizedExisting = normalizeHospitalName(existing);
      if (normalizedNew === normalizedExisting) {
        return existing;
      }
    }

    // If no exact match, use AI for fuzzy matching
    const prompt = `You are a hospital name matcher. Check if the new hospital name matches any of the existing hospital names.

New hospital name: "${newName}"

Existing hospital names:
${existingNames.map((n, i) => `${i + 1}. ${n}`).join("\n")}

Instructions:
- Return ONLY the exact existing hospital name if it matches (even with spelling variations, abbreviations, or different word order)
- Return "NO_MATCH" if none match
- Consider common variations like "Hospital" vs "Medical Center", abbreviations, etc.

Response format: Just the matching name or "NO_MATCH"`;

    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a hospital name matching assistant. Return only the matching name or NO_MATCH.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 100,
    });

    const result = response.choices[0]?.message?.content?.trim() || "NO_MATCH";
    
    if (result === "NO_MATCH" || !existingNames.includes(result)) {
      return null;
    }

    return result;
  } catch (error) {
    console.error("Error in AI hospital name matching:", error);
    // Fallback to simple matching
    return simpleMatch(newName, existingNames);
  }
}

/**
 * Simple matching fallback
 */
function simpleMatch(newName: string, existingNames: string[]): string | null {
  const normalizedNew = normalizeHospitalName(newName);
  
  for (const existing of existingNames) {
    const normalizedExisting = normalizeHospitalName(existing);
    
    // Exact match
    if (normalizedNew === normalizedExisting) {
      return existing;
    }
    
    // Check if one contains the other (for partial matches)
    if (normalizedNew.length > 5 && normalizedExisting.length > 5) {
      if (normalizedNew.includes(normalizedExisting) || normalizedExisting.includes(normalizedNew)) {
        return existing;
      }
    }
  }
  
  return null;
}

/**
 * Get all unique hospital/clinic names from health workers
 */
export async function getAllHospitalNames(): Promise<string[]> {
  try {
    const { listAllDoctors } = await import("./data");
    const doctors = await listAllDoctors();
    
    const hospitalNames = new Set<string>();
    doctors.forEach((d) => {
      if (d.hospitalClinicName) {
        hospitalNames.add(d.hospitalClinicName);
      }
    });
    
    return Array.from(hospitalNames);
  } catch (error) {
    console.error("Error getting hospital names:", error);
    return [];
  }
}

