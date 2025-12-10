import Groq from "groq-sdk";

// Multi-API key support with auto-failover for Translation (Groq)
let translationInstances: Groq[] = [];
let currentKeyIndex = 0;
let failedKeys = new Set<number>();

/**
 * Get all available translation API keys from environment
 * Supports: TRANS_KEY_1, TRANS_KEY_2, ..., TRANS_KEY_20
 */
function getAllTranslationKeys(): string[] {
  const keys: string[] = [];
  const foundKeys: string[] = [];
  
  // Scan TRANS_KEY_1 through TRANS_KEY_20
  for (let i = 1; i <= 20; i++) {
    const envVarName = `TRANS_KEY_${i}`;
    const key = process.env[envVarName];
    if (key && key.trim() && key.trim().length > 0) {
      const trimmedKey = key.trim();
      foundKeys.push(trimmedKey);
      keys.push(trimmedKey);
      const keyPreview = trimmedKey.substring(0, 10) + "...";
      console.log(`[Translation] Found ${envVarName} with key: ${keyPreview}`);
    } else {
      // Log when key is not found (only for first few to avoid spam)
      if (i <= 5) {
        console.log(`[Translation] ${envVarName} not found or empty`);
      }
    }
  }
  
  if (foundKeys.length > 0) {
    console.log(`[Translation] Found ${foundKeys.length} individual key(s): TRANS_KEY_1 through TRANS_KEY_${foundKeys.length}`);
  }
  
  const uniqueKeys = [...new Set(keys)];
  
  if (uniqueKeys.length === 0) {
    console.warn(`[Translation] No API keys found! Check environment variables: TRANS_KEY_1 through TRANS_KEY_20`);
  } else {
    console.log(`[Translation] Total unique API keys found: ${uniqueKeys.length}`);
  }
  
  return uniqueKeys;
}

/**
 * Initialize translation clients for all available API keys
 */
function initializeTranslationClients(): void {
  if (translationInstances.length > 0) {
    console.log(`[Translation] Already initialized with ${translationInstances.length} key(s)`);
    return;
  }
  
  console.log(`[Translation] Initializing... Checking environment variables...`);
  const apiKeys = getAllTranslationKeys();
  
  if (apiKeys.length === 0) {
    if (process.env.NODE_ENV === "production" && !process.env.VERCEL && !process.env.NETLIFY) {
      throw new Error("No TRANS_KEY found. Set TRANS_KEY_1 through TRANS_KEY_20");
    }
    console.warn(`[Translation] No keys found, creating dummy instance for build`);
    translationInstances = [new Groq({ apiKey: "dummy-key-for-build" })];
    return;
  }
  
  translationInstances = apiKeys.map((key, index) => {
    const keyPreview = key.substring(0, 10) + "...";
    console.log(`[Translation] Creating client ${index + 1}/${apiKeys.length} with key: ${keyPreview}`);
    return new Groq({ apiKey: key });
  });
  
  console.log(`[Translation] ✅ Successfully initialized ${translationInstances.length} API key(s)`);
  currentKeyIndex = translationInstances.length > 0 ? translationInstances.length - 1 : 0;
  failedKeys.clear();
  if (translationInstances.length > 1) {
    console.log(`[Translation] 🔄 Will start from last key ${currentKeyIndex + 1}/${translationInstances.length} (reverse order)`);
  }
}

export function resetTranslationClients(): void {
  console.log(`[Translation] 🔄 Force resetting translation clients...`);
  translationInstances = [];
  currentKeyIndex = 0;
  failedKeys.clear();
  initializeTranslationClients();
}

function getNextTranslationClient(): Groq {
  initializeTranslationClients();
  
  if (translationInstances.length === 0) {
    throw new Error("No translation API keys configured");
  }
  
  if (failedKeys.size >= translationInstances.length) {
    console.log(`[Translation] ⚠️  All ${translationInstances.length} key(s) failed, resetting failed keys list (they may have recovered)`);
    failedKeys.clear();
  }
  
  if (currentKeyIndex === 0 && translationInstances.length > 1) {
    currentKeyIndex = translationInstances.length - 1;
    console.log(`[Translation] 🔄 Starting from last key ${currentKeyIndex + 1}/${translationInstances.length} (reverse order)`);
  }
  
  let attempts = 0;
  const startIndex = currentKeyIndex;
  
  while (attempts < translationInstances.length) {
    const client = translationInstances[currentKeyIndex];
    const isFailed = failedKeys.has(currentKeyIndex);
    
    if (!isFailed) {
      if (attempts > 0) {
        console.log(`[Translation] Found available key ${currentKeyIndex + 1}/${translationInstances.length} after skipping ${attempts} failed key(s)`);
      }
      return client;
    }
    
    currentKeyIndex = currentKeyIndex === 0 ? translationInstances.length - 1 : currentKeyIndex - 1;
    attempts++;
    if (currentKeyIndex === startIndex && attempts >= translationInstances.length) {
      break;
    }
  }
  
  console.warn(`[Translation] ⚠️  All keys marked as failed, using key ${currentKeyIndex + 1} anyway (last resort)`);
  return translationInstances[currentKeyIndex];
}

export function markTranslationKeyAsFailed(keyIndex: number): void {
  failedKeys.add(keyIndex);
  const availableCount = translationInstances.length - failedKeys.size;
  console.log(`[Translation] ❌ Marked key ${keyIndex + 1}/${translationInstances.length} as failed. Available keys: ${availableCount}/${translationInstances.length}`);
  const previousIndex = currentKeyIndex;
  currentKeyIndex = currentKeyIndex === 0 ? translationInstances.length - 1 : currentKeyIndex - 1;
  if (currentKeyIndex === translationInstances.length - 1 && previousIndex === 0) {
    console.log(`[Translation] 🔄 Cycled through all keys, resetting to last key`);
  } else {
    console.log(`[Translation] ⬅️  Switching to key ${currentKeyIndex + 1}/${translationInstances.length} (reverse order)`);
  }
}

export function resetTranslationFailedKeys(): void {
  if (failedKeys.size > 0) {
    console.log(`[Translation] Resetting ${failedKeys.size} failed key(s)`);
    failedKeys.clear();
  }
}

/**
 * Translate text using Groq with automatic failover
 */
export async function translateWithGroq(prompt: string): Promise<string> {
  let lastError: any = null;
  initializeTranslationClients();
  const maxAttempts = translationInstances.length || 1;
  
  if (maxAttempts === 0) {
    throw new Error("No translation API keys configured");
  }
  
  console.log(`[Translation] Starting request with ${maxAttempts} available key(s)`);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const client = getNextTranslationClient();
    const keyIndex = currentKeyIndex;
    console.log(`[Translation] Attempt ${attempt + 1}/${maxAttempts}: Using key ${keyIndex + 1}/${translationInstances.length}`);
    
    try {
      const result = await client.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 1000,
      });
      
      const translated = result.choices?.[0]?.message?.content?.trim() || "";
      
      if (!translated) {
        throw new Error("Empty translation response");
      }
      
      if (attempt > 0) {
        failedKeys.delete(keyIndex);
        console.log(`[Translation] ✅ Key ${keyIndex + 1} recovered, request succeeded on attempt ${attempt + 1}`);
      } else {
        console.log(`[Translation] ✅ Request succeeded with key ${keyIndex + 1}/${translationInstances.length}`);
      }
      
      return translated;
    } catch (error: any) {
      lastError = error;
      const errorStatus = error?.status;
      const errorCode = error?.error?.code || error?.code;
      const errorMessage = error?.message || JSON.stringify(error?.error || {});
      
      const isRateLimit = errorStatus === 429 || errorCode === 429 || errorMessage?.includes('rate limit') || errorMessage?.includes('429');
      const isApiError = errorStatus === 401 || errorStatus === 403 || errorCode === 401 || errorCode === 403 || errorMessage?.includes('API') || errorMessage?.includes('unauthorized');
      const isServiceUnavailable = errorStatus === 503 || errorStatus === 500 || errorStatus === 502 || errorStatus === 504 || 
                                   errorCode === 503 || errorCode === 500 || errorCode === 502 || errorCode === 504 ||
                                   errorMessage?.includes('overloaded') || errorMessage?.includes('unavailable') || 
                                   errorMessage?.includes('UNAVAILABLE') || errorMessage?.includes('503') ||
                                   errorMessage?.includes('try again later') || errorMessage?.includes('service unavailable');
      
      if (isRateLimit || isApiError || isServiceUnavailable) {
        let errorType = 'API error';
        if (isRateLimit) errorType = 'Rate limit';
        else if (isServiceUnavailable) errorType = 'Service unavailable';
        
        console.log(`[Translation] ⚠️  Key ${keyIndex + 1} failed with status ${errorStatus || errorCode || 'unknown'}: ${errorType}`);
        markTranslationKeyAsFailed(keyIndex);
        
        if (attempt < maxAttempts - 1) {
          console.log(`[Translation] 🔄 Retrying with next key (reverse order)...`);
          continue;
        } else {
          console.error(`[Translation] ❌ All ${maxAttempts} key(s) failed. No more keys to try.`);
        }
      } else {
        console.error(`[Translation] ❌ Key ${keyIndex + 1} failed with non-skippable error: ${errorMessage || 'Unknown error'}`);
        throw error;
      }
    }
  }
  
  console.error(`[Translation] ❌ All ${maxAttempts} key(s) exhausted. Last error: ${lastError?.message || 'Unknown'}`);
  throw lastError || new Error(`All ${maxAttempts} translation API key(s) failed`);
}

export function isTranslationConfigured(): boolean {
  const keys = getAllTranslationKeys();
  return keys.length > 0;
}

