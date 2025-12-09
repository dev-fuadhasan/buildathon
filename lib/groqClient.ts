import Groq from "groq-sdk";

// Multi-API key support with auto-failover
let groqInstances: Groq[] = [];
let currentKeyIndex = 0;
let failedKeys = new Set<number>(); // Track keys that failed (rate limit, etc.)

/**
 * Get all available API keys from environment
 * Supports: GROQ_API_KEY, GROQ_API_KEY_1, GROQ_API_KEY_2, ..., GROQ_API_KEY_6
 * Or comma-separated: GROQ_API_KEY=key1,key2,key3,...
 */
function getAllApiKeys(): string[] {
  const keys: string[] = [];
  
  // Method 1: Comma-separated in GROQ_API_KEY
  const mainKey = process.env.GROQ_API_KEY;
  if (mainKey) {
    const splitKeys = mainKey.split(',').map(k => k.trim()).filter(k => k);
    keys.push(...splitKeys);
  }
  
  // Method 2: Individual keys GROQ_API_KEY_1, GROQ_API_KEY_2, etc.
  for (let i = 1; i <= 6; i++) {
    const key = process.env[`GROQ_API_KEY_${i}`];
    if (key && key.trim()) {
      keys.push(key.trim());
    }
  }
  
  // Remove duplicates
  return [...new Set(keys)];
}

/**
 * Initialize Groq clients for all available API keys
 */
function initializeGroqClients(): void {
  if (groqInstances.length > 0) return; // Already initialized
  
  const apiKeys = getAllApiKeys();
  
  if (apiKeys.length === 0) {
    // During build, env vars may not be available - create a dummy instance
    if (process.env.NODE_ENV === "production" && !process.env.VERCEL && !process.env.NETLIFY) {
      throw new Error("No GROQ_API_KEY found. Set GROQ_API_KEY or GROQ_API_KEY_1 through GROQ_API_KEY_6");
    }
    // Create dummy for build
    groqInstances = [new Groq({ apiKey: "dummy-key-for-build" })];
    return;
  }
  
  // Create Groq client for each key
  groqInstances = apiKeys.map(key => new Groq({ apiKey: key }));
  console.log(`[Groq] Initialized ${groqInstances.length} API key(s)`);
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
    console.log("[Groq] All keys failed, resetting failed keys list");
    failedKeys.clear();
  }
  
  // Try to find an available key (not in failed list)
  let attempts = 0;
  while (attempts < groqInstances.length) {
    const client = groqInstances[currentKeyIndex];
    
    if (!failedKeys.has(currentKeyIndex)) {
      return client;
    }
    
    // Move to next key
    currentKeyIndex = (currentKeyIndex + 1) % groqInstances.length;
    attempts++;
  }
  
  // If all keys are marked as failed, use the current one anyway
  return groqInstances[currentKeyIndex];
}

/**
 * Mark a key as failed (rate limit, error, etc.)
 */
export function markKeyAsFailed(keyIndex: number): void {
  failedKeys.add(keyIndex);
  console.log(`[Groq] Marked key ${keyIndex + 1} as failed. Available keys: ${groqInstances.length - failedKeys.size}/${groqInstances.length}`);
  
  // Move to next key
  currentKeyIndex = (currentKeyIndex + 1) % groqInstances.length;
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
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const client = getNextGroqClient();
    const keyIndex = currentKeyIndex;
    
    try {
      const result = await client.chat.completions.create(params);
      // Success - reset failed keys if this was a retry
      if (attempt > 0) {
        failedKeys.delete(keyIndex);
        console.log(`[Groq] Key ${keyIndex + 1} recovered, request succeeded`);
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
        markKeyAsFailed(keyIndex);
        console.log(`[Groq] Key ${keyIndex + 1} failed (${error?.status || 'error'}), switching to next key...`);
        
        // If we have more keys, try next one
        if (attempt < maxAttempts - 1) {
          continue; // Try next key
        }
      }
      
      // If not rate limit/API error, or no more keys, throw
      throw error;
    }
  }
  
  // All keys failed
  throw lastError || new Error("All Groq API keys failed");
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

