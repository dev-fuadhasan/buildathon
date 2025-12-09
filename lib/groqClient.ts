import Groq from "groq-sdk";

// Multi-API key support with auto-failover
let groqInstances: Groq[] = [];
let currentKeyIndex = 0;
let failedKeys = new Set<number>(); // Track keys that failed (rate limit, etc.)

// Rate limiting: Track concurrent requests per key
const keyRequestCounts = new Map<number, number>();
const MAX_CONCURRENT_PER_KEY = 5; // Max 5 concurrent requests per key
const requestQueues = new Map<number, Array<() => void>>(); // Queue for each key

// Helper to wait for available slot in rate limit
async function waitForRateLimitSlot(keyIndex: number): Promise<void> {
  const currentCount = keyRequestCounts.get(keyIndex) || 0;
  
  if (currentCount < MAX_CONCURRENT_PER_KEY) {
    keyRequestCounts.set(keyIndex, currentCount + 1);
    return;
  }
  
  // Wait in queue
  return new Promise((resolve) => {
    const queue = requestQueues.get(keyIndex) || [];
    requestQueues.set(keyIndex, queue);
    queue.push(() => {
      const count = keyRequestCounts.get(keyIndex) || 0;
      keyRequestCounts.set(keyIndex, count + 1);
      resolve();
    });
  });
}

// Release rate limit slot
function releaseRateLimitSlot(keyIndex: number): void {
  const currentCount = keyRequestCounts.get(keyIndex) || 0;
  keyRequestCounts.set(keyIndex, Math.max(0, currentCount - 1));
  
  // Process queued requests
  const queue = requestQueues.get(keyIndex) || [];
  if (queue.length > 0) {
    const next = queue.shift();
    if (next) next();
  }
}

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
  // Start from LAST key (reverse order: key 14, 13, 12, ...)
  currentKeyIndex = groqInstances.length > 0 ? groqInstances.length - 1 : 0;
  failedKeys.clear(); // Clear any previous failures
  if (groqInstances.length > 1) {
    console.log(`[Groq] 🔄 Will start from last key ${currentKeyIndex + 1}/${groqInstances.length} (reverse order)`);
  }
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
 * Get the next available Groq client (reverse order: last key first, with failover)
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
  
  // Start from LAST key (reverse order) if currentKeyIndex is 0 (first call)
  if (currentKeyIndex === 0 && groqInstances.length > 1) {
    currentKeyIndex = groqInstances.length - 1; // Start from last key
    console.log(`[Groq] 🔄 Starting from last key ${currentKeyIndex + 1}/${groqInstances.length} (reverse order)`);
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
    
    // Move to PREVIOUS key (reverse order: going backwards)
    currentKeyIndex = currentKeyIndex === 0 ? groqInstances.length - 1 : currentKeyIndex - 1;
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
  
  // Move to PREVIOUS key (reverse order: going backwards)
  const previousIndex = currentKeyIndex;
  currentKeyIndex = currentKeyIndex === 0 ? groqInstances.length - 1 : currentKeyIndex - 1;
  
  // If we've cycled through all keys, log it
  if (currentKeyIndex === groqInstances.length - 1 && previousIndex === 0) {
    console.log(`[Groq] 🔄 Cycled through all keys, resetting to last key`);
  } else {
    console.log(`[Groq] ⬅️  Switching to key ${currentKeyIndex + 1}/${groqInstances.length} (reverse order)`);
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
      // Wait for rate limit slot (prevents burst traffic)
      await waitForRateLimitSlot(keyIndex);
      
      const result = await client.chat.completions.create(params);
      
      // Release rate limit slot on success
      releaseRateLimitSlot(keyIndex);
      
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
      
      // Check error details
      const errorStatus = error?.status;
      const errorCode = error?.error?.code || error?.code;
      const errorMessage = error?.message || JSON.stringify(error?.error || {});
      
      // Check if it's a rate limit
      const isRateLimit = errorStatus === 429 || 
                        errorMessage?.includes('rate limit') ||
                        errorMessage?.includes('429');
      
      // Check if it's an API/auth error (401, 403)
      const isApiError = errorStatus === 401 || 
                       errorStatus === 403 ||
                       errorMessage?.includes('API');
      
      // Check if it's an organization restriction (400 with organization_restricted code)
      const isOrganizationRestricted = errorStatus === 400 && 
                                     (errorCode === 'organization_restricted' ||
                                      errorMessage?.includes('organization_restricted') ||
                                      errorMessage?.includes('Organization has been restricted'));
      
      // Release rate limit slot on error
      releaseRateLimitSlot(keyIndex);
      
      // Skip this key if it's rate limit, API error, or organization restricted
      if (isRateLimit || isApiError || isOrganizationRestricted) {
        const errorType = isRateLimit ? 'Rate limit' : 
                         isOrganizationRestricted ? 'Organization restricted' : 
                         'API error';
        console.log(`[Groq] ⚠️  Key ${keyIndex + 1} failed with status ${errorStatus || 'unknown'}: ${errorType}`);
        markKeyAsFailed(keyIndex);
        
        // If we have more keys, try next one WITH DELAY (exponential backoff)
        if (attempt < maxAttempts - 1) {
          // Exponential backoff: 1s, 2s, 4s, max 5s
          const delayMs = Math.min(1000 * Math.pow(2, attempt), 5000);
          console.log(`[Groq] ⏳ Waiting ${delayMs}ms before retrying with next key (respectful retry)...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          console.log(`[Groq] 🔄 Retrying with next key (reverse order)...`);
          continue; // Try next key
        } else {
          console.error(`[Groq] ❌ All ${maxAttempts} key(s) failed. No more keys to try.`);
        }
      } else {
        // If not a skippable error, throw immediately (don't try other keys)
        console.error(`[Groq] ❌ Key ${keyIndex + 1} failed with non-skippable error: ${errorMessage || 'Unknown error'}`);
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

