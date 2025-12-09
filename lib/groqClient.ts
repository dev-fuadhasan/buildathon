import Groq from "groq-sdk";

// Multi-API key support with auto-failover
let groqInstances: Groq[] = [];
let currentKeyIndex = 0;
let failedKeys = new Set<number>(); // Track keys that failed (rate limit, etc.)

/**
 * Get all available API keys from environment
 * Supports: GROQ_API_KEY, GROQ_API_KEY_1, GROQ_API_KEY_2, ..., GROQ_API_KEY_20
 * Or comma-separated: GROQ_API_KEY=key1,key2,key3,...
 */
function getAllApiKeys(): string[] {
  const keys: string[] = [];
  
  // Method 1: Comma-separated in GROQ_API_KEY
  const mainKey = process.env.GROQ_API_KEY;
  if (mainKey && mainKey.trim()) {
    const splitKeys = mainKey.split(',').map(k => k.trim()).filter(k => k && k.length > 0);
    if (splitKeys.length > 0) {
      keys.push(...splitKeys);
      console.log(`[Groq] Found ${splitKeys.length} key(s) in GROQ_API_KEY (comma-separated)`);
    }
  }
  
  // Method 2: Individual keys GROQ_API_KEY_1, GROQ_API_KEY_2, etc.
  // Scans up to 20 keys for flexibility
  const foundIndividualKeys: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const envVarName = `GROQ_API_KEY_${i}`;
    const key = process.env[envVarName];
    if (key && key.trim() && key.trim().length > 0) {
      const trimmedKey = key.trim();
      foundIndividualKeys.push(trimmedKey);
      keys.push(trimmedKey);
      console.log(`[Groq] Found ${envVarName}`);
    }
  }
  
  if (foundIndividualKeys.length > 0) {
    console.log(`[Groq] Found ${foundIndividualKeys.length} individual key(s): GROQ_API_KEY_1 through GROQ_API_KEY_${foundIndividualKeys.length}`);
  }
  
  // Remove duplicates (in case same key is in both methods)
  const uniqueKeys = [...new Set(keys)];
  
  if (uniqueKeys.length === 0) {
    console.warn(`[Groq] No API keys found! Check environment variables: GROQ_API_KEY or GROQ_API_KEY_1 through GROQ_API_KEY_20`);
  } else {
    console.log(`[Groq] Total unique API keys found: ${uniqueKeys.length}`);
  }
  
  return uniqueKeys;
}

/**
 * Initialize Groq clients for all available API keys
 */
function initializeGroqClients(): void {
  if (groqInstances.length > 0) {
    // Already initialized, but log current status
    console.log(`[Groq] Already initialized with ${groqInstances.length} key(s)`);
    return;
  }
  
  console.log(`[Groq] Initializing... Checking environment variables...`);
  const apiKeys = getAllApiKeys();
  
  if (apiKeys.length === 0) {
    // During build, env vars may not be available - create a dummy instance
    if (process.env.NODE_ENV === "production" && !process.env.VERCEL && !process.env.NETLIFY) {
      throw new Error("No GROQ_API_KEY found. Set GROQ_API_KEY or GROQ_API_KEY_1 through GROQ_API_KEY_20");
    }
    // Create dummy for build
    console.warn(`[Groq] No keys found, creating dummy instance for build`);
    groqInstances = [new Groq({ apiKey: "dummy-key-for-build" })];
    return;
  }
  
  // Create Groq client for each key
  groqInstances = apiKeys.map((key, index) => {
    // Log first 10 chars of key for debugging (don't log full key for security)
    const keyPreview = key.substring(0, 10) + "...";
    console.log(`[Groq] Creating client ${index + 1}/${apiKeys.length} with key: ${keyPreview}`);
    return new Groq({ apiKey: key });
  });
  
  console.log(`[Groq] ✅ Successfully initialized ${groqInstances.length} API key(s)`);
  currentKeyIndex = 0; // Reset to first key
  failedKeys.clear(); // Clear any previous failures
}

/**
 * Force re-initialization (useful if env vars changed)
 */
export function resetGroqClients(): void {
  console.log(`[Groq] 🔄 Force resetting Groq clients...`);
  groqInstances = [];
  currentKeyIndex = 0;
  failedKeys.clear();
  initializeGroqClients();
}

/**
 * Get the next available Groq client (round-robin with failover)
 */
function getNextGroqClient(): Groq {
  initializeGroqClients();
  
  if (groqInstances.length === 0) {
    throw new Error("No Groq API keys configured");
  }
  
  // If all keys failed, reset failed keys (they might have recovered)
  if (failedKeys.size >= groqInstances.length) {
    console.log(`[Groq] ⚠️  All ${groqInstances.length} key(s) failed, resetting failed keys list (they may have recovered)`);
    failedKeys.clear();
  }
  
  // Try to find an available key (not in failed list)
  let attempts = 0;
  const startIndex = currentKeyIndex;
  
  while (attempts < groqInstances.length) {
    const client = groqInstances[currentKeyIndex];
    const isFailed = failedKeys.has(currentKeyIndex);
    
    if (!isFailed) {
      if (attempts > 0) {
        console.log(`[Groq] Found available key ${currentKeyIndex + 1}/${groqInstances.length} after skipping ${attempts} failed key(s)`);
      }
      return client;
    }
    
    // Move to next key
    currentKeyIndex = (currentKeyIndex + 1) % groqInstances.length;
    attempts++;
    
    // Prevent infinite loop
    if (currentKeyIndex === startIndex && attempts >= groqInstances.length) {
      break;
    }
  }
  
  // If all keys are marked as failed, use the current one anyway (last resort)
  console.warn(`[Groq] ⚠️  All keys marked as failed, using key ${currentKeyIndex + 1} anyway (last resort)`);
  return groqInstances[currentKeyIndex];
}

/**
 * Mark a key as failed (rate limit, error, etc.)
 */
export function markKeyAsFailed(keyIndex: number): void {
  failedKeys.add(keyIndex);
  const availableCount = groqInstances.length - failedKeys.size;
  console.log(`[Groq] ❌ Marked key ${keyIndex + 1}/${groqInstances.length} as failed. Available keys: ${availableCount}/${groqInstances.length}`);
  
  // Move to next key
  const previousIndex = currentKeyIndex;
  currentKeyIndex = (currentKeyIndex + 1) % groqInstances.length;
  
  // If we've cycled through all keys, log it
  if (currentKeyIndex === 0 && previousIndex === groqInstances.length - 1) {
    console.log(`[Groq] 🔄 Cycled through all keys, resetting to key 1`);
  } else {
    console.log(`[Groq] ➡️  Switching to key ${currentKeyIndex + 1}/${groqInstances.length}`);
  }
}

/**
 * Reset failed keys (call after some time to retry failed keys)
 */
export function resetFailedKeys(): void {
  if (failedKeys.size > 0) {
    console.log(`[Groq] Resetting ${failedKeys.size} failed key(s)`);
    failedKeys.clear();
  }
}

/**
 * Get current key index (for tracking which key is being used)
 */
export function getCurrentKeyIndex(): number {
  return currentKeyIndex;
}

/**
 * Wrapper for chat.completions.create with automatic failover
 */
async function createWithFailover(params: any) {
  let lastError: any = null;
  initializeGroqClients();
  const maxAttempts = groqInstances.length || 1;
  
  if (maxAttempts === 0) {
    throw new Error("No Groq API keys configured");
  }
  
  console.log(`[Groq] Starting request with ${maxAttempts} available key(s)`);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const client = getNextGroqClient();
    const keyIndex = currentKeyIndex;
    
    console.log(`[Groq] Attempt ${attempt + 1}/${maxAttempts}: Using key ${keyIndex + 1}/${groqInstances.length}`);
    
    try {
      const result = await client.chat.completions.create(params);
      // Success - reset failed keys if this was a retry
      if (attempt > 0) {
        failedKeys.delete(keyIndex);
        console.log(`[Groq] ✅ Key ${keyIndex + 1} recovered, request succeeded on attempt ${attempt + 1}`);
      } else {
        console.log(`[Groq] ✅ Request succeeded with key ${keyIndex + 1}/${groqInstances.length}`);
      }
      return result;
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a rate limit or API error
      const isRateLimit = error?.status === 429 || 
                        error?.message?.includes('rate limit') ||
                        error?.message?.includes('429');
      const isApiError = error?.status === 401 || 
                       error?.status === 403 ||
                       error?.message?.includes('API');
      
      if (isRateLimit || isApiError) {
        console.log(`[Groq] ⚠️  Key ${keyIndex + 1} failed with status ${error?.status || 'unknown'}: ${isRateLimit ? 'Rate limit' : 'API error'}`);
        markKeyAsFailed(keyIndex);
        
        // If we have more keys, try next one
        if (attempt < maxAttempts - 1) {
          console.log(`[Groq] 🔄 Retrying with next key...`);
          continue; // Try next key
        } else {
          console.error(`[Groq] ❌ All ${maxAttempts} key(s) failed. No more keys to try.`);
        }
      } else {
        // If not rate limit/API error, throw immediately (don't try other keys)
        console.error(`[Groq] ❌ Key ${keyIndex + 1} failed with non-rate-limit error: ${error?.message || 'Unknown error'}`);
        throw error;
      }
    }
  }
  
  // All keys failed
  console.error(`[Groq] ❌ All ${maxAttempts} key(s) exhausted. Last error: ${lastError?.message || 'Unknown'}`);
  throw lastError || new Error(`All ${maxAttempts} Groq API key(s) failed`);
}

// Export a proxy that handles multi-key failover
export const groq = new Proxy({} as Groq, {
  get(_target, prop) {
    // For chat.completions.create, use failover wrapper
    if (prop === 'chat') {
      return {
        completions: {
          create: createWithFailover,
        },
      };
    }
    
    // For other properties, use the current client
    return getNextGroqClient()[prop as keyof Groq];
  },
});

// Helper to check if Groq is configured
export function isGroqConfigured(): boolean {
  const keys = getAllApiKeys();
  return keys.length > 0;
}

