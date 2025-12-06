/**
 * Timezone Detection from IP/Country
 * Detects user's timezone from their IP address or request headers
 */

/**
 * Gets client IP from NextRequest
 */
export function getClientIP(req: Request | { ip?: string; headers: Headers }): string | null {
  // If it's a NextRequest with ip property
  if ('ip' in req && req.ip) {
    return req.ip;
  }
  
  // Try various headers that might contain the real IP
  const headers = req.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  const realIP = headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  
  const cfConnectingIP = headers.get("cf-connecting-ip");
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
  // If no IP or localhost, fall back to address-based detection
  if (!ip || ip === "::1" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
    console.log(`[Timezone] Using address-based detection for IP: ${ip}`);
    return detectTimezoneFromAddress(address);
  }

  try {
    // Try ipapi.co first (free, no key required)
    const response = await fetch(`https://ipapi.co/${ip}/timezone/`, {
      headers: {
        "User-Agent": "MomsCare/1.0",
      },
      // Add timeout
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      const timezone = await response.text();
      if (timezone && timezone.trim() && !timezone.includes("error") && !timezone.includes("undefined")) {
        const tz = timezone.trim();
        console.log(`[Timezone] Detected from IP ${ip}: ${tz}`);
        return tz;
      }
    }
  } catch (err) {
    console.error("Failed to detect timezone from ipapi.co:", err);
  }

  // Try alternative API: ip-api.com (free, no key required)
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=timezone`, {
      headers: {
        "User-Agent": "MomsCare/1.0",
      },
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.timezone) {
        console.log(`[Timezone] Detected from ip-api.com for IP ${ip}: ${data.timezone}`);
        return data.timezone;
      }
    }
  } catch (err) {
    console.error("Failed to detect timezone from ip-api.com:", err);
  }

  // Fallback to address-based detection
  console.log(`[Timezone] Falling back to address-based detection for IP: ${ip}`);
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

