/**
 * Enhanced Location Detection
 * Detects full location details from IP address including country, city, region, etc.
 */

export interface LocationData {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  regionCode: string;
  city: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  timezone: string;
  isp?: string;
  address?: string; // Full formatted address
  culture?: string; // Cultural context (e.g., "South Asian", "Western", "Middle Eastern")
  climate?: string; // Climate type (e.g., "tropical", "temperate", "cold")
  urbanRural?: "urban" | "rural" | "suburban";
}

/**
 * Detects full location details from IP address
 */
export async function detectLocationFromIP(ip: string | null): Promise<LocationData> {
  // Default location (Bangladesh)
  const defaultLocation: LocationData = {
    ip: ip || "unknown",
    country: "Bangladesh",
    countryCode: "BD",
    region: "Dhaka",
    regionCode: "DH",
    city: "Dhaka",
    timezone: "Asia/Dhaka",
    culture: "South Asian",
    climate: "tropical",
    urbanRural: "urban",
  };

  // If no IP or localhost, return default
  if (!ip || ip === "::1" || ip === "127.0.0.1" || 
      ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
    console.log(`[Location] Using default location for IP: ${ip}`);
    return defaultLocation;
  }

  // Try ipapi.co first (free, provides comprehensive data)
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: {
        "User-Agent": "MomsCare/1.0",
      },
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data && !data.error) {
        const location: LocationData = {
          ip: data.ip || ip,
          country: data.country_name || data.country || "Unknown",
          countryCode: data.country_code || data.country_code_iso3 || "",
          region: data.region || data.region_code || "",
          regionCode: data.region_code || "",
          city: data.city || "",
          postalCode: data.postal || "",
          latitude: data.latitude,
          longitude: data.longitude,
          timezone: data.timezone || "Asia/Dhaka",
          isp: data.org || "",
          address: formatAddress(data),
          culture: detectCulture(data),
          climate: detectClimate(data),
          urbanRural: detectUrbanRural(data),
        };
        
        console.log(`[Location] Detected from ipapi.co: ${location.city}, ${location.region}, ${location.country}`);
        return location;
      }
    }
  } catch (err) {
    console.error("Failed to detect location from ipapi.co:", err);
  }

  // Try ip-api.com as fallback
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,query`, {
      headers: {
        "User-Agent": "MomsCare/1.0",
      },
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.status === "success") {
        const location: LocationData = {
          ip: data.query || ip,
          country: data.country || "Unknown",
          countryCode: data.countryCode || "",
          region: data.regionName || data.region || "",
          regionCode: data.region || "",
          city: data.city || "",
          postalCode: data.zip || "",
          latitude: data.lat,
          longitude: data.lon,
          timezone: data.timezone || "Asia/Dhaka",
          isp: data.isp || "",
          address: formatAddressFromIpApi(data),
          culture: detectCulture(data),
          climate: detectClimate(data),
          urbanRural: detectUrbanRural(data),
        };
        
        console.log(`[Location] Detected from ip-api.com: ${location.city}, ${location.region}, ${location.country}`);
        return location;
      }
    }
  } catch (err) {
    console.error("Failed to detect location from ip-api.com:", err);
  }

  // Fallback to default
  console.log(`[Location] Falling back to default location for IP: ${ip}`);
  return defaultLocation;
}

/**
 * Format address from ipapi.co response
 */
function formatAddress(data: any): string {
  const parts: string[] = [];
  if (data.city) parts.push(data.city);
  if (data.region) parts.push(data.region);
  if (data.postal) parts.push(data.postal);
  if (data.country_name) parts.push(data.country_name);
  return parts.join(", ") || "";
}

/**
 * Format address from ip-api.com response
 */
function formatAddressFromIpApi(data: any): string {
  const parts: string[] = [];
  if (data.city) parts.push(data.city);
  if (data.regionName) parts.push(data.regionName);
  if (data.zip) parts.push(data.zip);
  if (data.country) parts.push(data.country);
  return parts.join(", ") || "";
}

/**
 * Detect cultural context from location data
 */
function detectCulture(data: any): string {
  const country = (data.country_name || data.country || "").toLowerCase();
  const countryCode = (data.country_code || data.countryCode || "").toLowerCase();
  
  // South Asian
  if (country.includes("bangladesh") || country.includes("india") || 
      country.includes("pakistan") || country.includes("sri lanka") ||
      country.includes("nepal") || countryCode === "bd" || countryCode === "in" ||
      countryCode === "pk" || countryCode === "lk" || countryCode === "np") {
    return "South Asian";
  }
  
  // Middle Eastern
  if (country.includes("saudi") || country.includes("uae") || 
      country.includes("qatar") || country.includes("kuwait") ||
      country.includes("bahrain") || country.includes("oman")) {
    return "Middle Eastern";
  }
  
  // East Asian
  if (country.includes("china") || country.includes("japan") || 
      country.includes("korea") || country.includes("thailand") ||
      country.includes("vietnam") || country.includes("singapore")) {
    return "East Asian";
  }
  
  // Western
  if (country.includes("united states") || country.includes("canada") ||
      country.includes("united kingdom") || country.includes("australia") ||
      country.includes("new zealand") || country.includes("germany") ||
      country.includes("france") || country.includes("italy") ||
      country.includes("spain")) {
    return "Western";
  }
  
  // African
  if (country.includes("africa") || country.includes("nigeria") ||
      country.includes("kenya") || country.includes("south africa")) {
    return "African";
  }
  
  return "Global";
}

/**
 * Detect climate from location data
 */
function detectClimate(data: any): string {
  const country = (data.country_name || data.country || "").toLowerCase();
  const lat = data.latitude || data.lat;
  
  // Use latitude if available
  if (lat !== undefined) {
    if (Math.abs(lat) < 23.5) return "tropical";
    if (Math.abs(lat) < 35) return "subtropical";
    if (Math.abs(lat) < 50) return "temperate";
    return "cold";
  }
  
  // Use country name as fallback
  if (country.includes("bangladesh") || country.includes("india") ||
      country.includes("thailand") || country.includes("philippines") ||
      country.includes("indonesia") || country.includes("malaysia") ||
      country.includes("sri lanka")) {
    return "tropical";
  }
  
  if (country.includes("canada") || country.includes("russia") ||
      country.includes("norway") || country.includes("sweden") ||
      country.includes("finland")) {
    return "cold";
  }
  
  return "temperate";
}

/**
 * Detect urban/rural setting (heuristic based on city size/population)
 */
function detectUrbanRural(data: any): "urban" | "rural" | "suburban" {
  const city = (data.city || "").toLowerCase();
  const country = (data.country_name || data.country || "").toLowerCase();
  
  // Major cities are likely urban
  const majorCities = [
    "dhaka", "chittagong", "sylhet", "rajshahi", "khulna",
    "mumbai", "delhi", "bangalore", "kolkata", "chennai",
    "karachi", "lahore", "islamabad",
    "london", "new york", "los angeles", "chicago", "toronto",
    "sydney", "melbourne", "tokyo", "singapore", "hong kong"
  ];
  
  if (majorCities.some(mc => city.includes(mc))) {
    return "urban";
  }
  
  // If we have a city name, likely urban or suburban
  if (city && city.length > 0) {
    return "suburban";
  }
  
  return "rural";
}

/**
 * Get location from address string (fallback method)
 */
export function getLocationFromAddress(address?: string): Partial<LocationData> {
  if (!address) {
    return {
      country: "Bangladesh",
      countryCode: "BD",
      region: "Dhaka",
      city: "Dhaka",
      timezone: "Asia/Dhaka",
      culture: "South Asian",
      climate: "tropical",
      urbanRural: "urban",
    };
  }
  
  const addr = address.toLowerCase();
  
  // Bangladesh
  if (addr.includes("bangladesh") || addr.includes("bd") || 
      addr.includes("dhaka") || addr.includes("chittagong") ||
      addr.includes("sylhet") || addr.includes("rajshahi")) {
    return {
      country: "Bangladesh",
      countryCode: "BD",
      region: addr.includes("chittagong") ? "Chittagong" : 
              addr.includes("sylhet") ? "Sylhet" :
              addr.includes("rajshahi") ? "Rajshahi" : "Dhaka",
      city: addr.includes("dhaka") ? "Dhaka" :
            addr.includes("chittagong") ? "Chittagong" :
            addr.includes("sylhet") ? "Sylhet" : "Unknown",
      timezone: "Asia/Dhaka",
      culture: "South Asian",
      climate: "tropical",
      urbanRural: "urban",
    };
  }
  
  // Default
  return {
    country: "Unknown",
    countryCode: "",
    region: "",
    city: "",
    timezone: "Asia/Dhaka",
    culture: "Global",
    climate: "temperate",
    urbanRural: "urban",
  };
}

