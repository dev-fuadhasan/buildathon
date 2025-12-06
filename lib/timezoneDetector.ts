/**
 * Timezone Detection from IP/Country
 * Detects user's timezone from their IP address or request headers
 */

/**
 * Gets client IP from request
 */
export function getClientIP(req: Request): string | null {
  // Try various headers that might contain the real IP
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  const realIP = req.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  
  const cfConnectingIP = req.headers.get("cf-connecting-ip");
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  return null;
}

/**
 * Detects timezone from IP using a free API (ipapi.co or similar)
 * Falls back to address-based detection if IP detection fails
 */
export async function detectTimezoneFromIP(ip: string | null, address?: string): Promise<string> {
  // If no IP, fall back to address-based detection
  if (!ip || ip === "::1" || ip === "127.0.0.1") {
    return detectTimezoneFromAddress(address);
  }

  try {
    // Use ipapi.co free API (no key required for basic timezone)
    const response = await fetch(`https://ipapi.co/${ip}/timezone/`, {
      headers: {
        "User-Agent": "MomsCare/1.0",
      },
    });
    
    if (response.ok) {
      const timezone = await response.text();
      if (timezone && timezone.trim() && !timezone.includes("error")) {
        return timezone.trim();
      }
    }
  } catch (err) {
    console.error("Failed to detect timezone from IP:", err);
  }

  // Fallback to address-based detection
  return detectTimezoneFromAddress(address);
}

/**
 * Detects timezone from address (fallback method)
 */
export function detectTimezoneFromAddress(address?: string): string {
  if (!address) return "Asia/Dhaka"; // Default to Bangladesh
  
  const addr = address.toLowerCase();
  
  // Bangladesh
  if (addr.includes("bangladesh") || addr.includes("bd") || addr.includes("dhaka") || 
      addr.includes("chittagong") || addr.includes("sylhet")) {
    return "Asia/Dhaka";
  }
  
  // USA
  if (addr.includes("usa") || addr.includes("united states") || addr.includes("new york") ||
      addr.includes("california") || addr.includes("texas")) {
    return "America/New_York";
  }
  
  // UK
  if (addr.includes("uk") || addr.includes("united kingdom") || addr.includes("london")) {
    return "Europe/London";
  }
  
  // India
  if (addr.includes("india") || addr.includes("delhi") || addr.includes("mumbai")) {
    return "Asia/Kolkata";
  }
  
  // Default to Bangladesh
  return "Asia/Dhaka";
}

