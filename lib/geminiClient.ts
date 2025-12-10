import { GoogleGenAI } from "@google/genai";

// Multi-API key support with auto-failover for Gemini (Google GenAI)
let geminiInstances: GoogleGenAI[] = [];
let currentKeyIndex = 0;
let failedKeys = new Set<number>();

function getAllApiKeys(): string[] {
  const keys: string[] = [];

  // Method 1: Comma-separated in GEMINI_API_KEY
  const mainKey = process.env.GEMINI_API_KEY;
  if (mainKey && mainKey.trim()) {
    const splitKeys = mainKey.split(',').map(k => k.trim()).filter(k => k && k.length > 0);
    if (splitKeys.length > 0) {
      keys.push(...splitKeys);
      console.log(`[Gemini] Found ${splitKeys.length} key(s) in GEMINI_API_KEY (comma-separated)`);
    }
  }

  // Method 2: Individual keys GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.
  const foundIndividualKeys: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const envVarName = `GEMINI_API_KEY_${i}`;
    const key = process.env[envVarName];
    if (key && key.trim() && key.trim().length > 0) {
      const trimmedKey = key.trim();
      foundIndividualKeys.push(trimmedKey);
      keys.push(trimmedKey);
      console.log(`[Gemini] Found ${envVarName}`);
    }
  }

  if (foundIndividualKeys.length > 0) {
    console.log(`[Gemini] Found ${foundIndividualKeys.length} individual key(s): GEMINI_API_KEY_1 through GEMINI_API_KEY_${foundIndividualKeys.length}`);
  }

  const uniqueKeys = [...new Set(keys)];

  if (uniqueKeys.length === 0) {
    console.warn(`[Gemini] No API keys found! Check environment variables: GEMINI_API_KEY or GEMINI_API_KEY_1 through GEMINI_API_KEY_20`);
  } else {
    console.log(`[Gemini] Total unique API keys found: ${uniqueKeys.length}`);
  }

  return uniqueKeys;
}

function initializeGeminiClients(): void {
  if (geminiInstances.length > 0) {
    console.log(`[Gemini] Already initialized with ${geminiInstances.length} key(s)`);
    return;
  }

  console.log(`[Gemini] Initializing... Checking environment variables...`);
  const apiKeys = getAllApiKeys();

  if (apiKeys.length === 0) {
    if (process.env.NODE_ENV === "production" && !process.env.VERCEL && !process.env.NETLIFY) {
      throw new Error("No GEMINI_API_KEY found. Set GEMINI_API_KEY or GEMINI_API_KEY_1 through GEMINI_API_KEY_20");
    }
    console.warn(`[Gemini] No keys found, creating dummy instance for build`);
    geminiInstances = [new GoogleGenAI({ apiKey: "dummy-key-for-build" })];
    return;
  }

  geminiInstances = apiKeys.map((key, index) => {
    const keyPreview = key.substring(0, 10) + "...";
    console.log(`[Gemini] Creating client ${index + 1}/${apiKeys.length} with key: ${keyPreview}`);
    // Set the API key in environment for this instance, or pass it explicitly
    // The SDK can read from GEMINI_API_KEY env var, but for multi-key support we pass it
    return new GoogleGenAI({ apiKey: key });
  });

  console.log(`[Gemini] ✅ Successfully initialized ${geminiInstances.length} API key(s)`);
  currentKeyIndex = geminiInstances.length > 0 ? geminiInstances.length - 1 : 0;
  failedKeys.clear();
  if (geminiInstances.length > 1) {
    console.log(`[Gemini] 🔄 Will start from last key ${currentKeyIndex + 1}/${geminiInstances.length} (reverse order)`);
  }
}

export function resetGeminiClients(): void {
  console.log(`[Gemini] 🔄 Force resetting Gemini clients...`);
  geminiInstances = [];
  currentKeyIndex = 0;
  failedKeys.clear();
  initializeGeminiClients();
}

function getNextGeminiClient(): GoogleGenAI {
  initializeGeminiClients();

  if (geminiInstances.length === 0) {
    throw new Error("No Gemini API keys configured");
  }

  if (failedKeys.size >= geminiInstances.length) {
    console.log(`[Gemini] ⚠️  All ${geminiInstances.length} key(s) failed, resetting failed keys list (they may have recovered)`);
    failedKeys.clear();
  }

  if (currentKeyIndex === 0 && geminiInstances.length > 1) {
    currentKeyIndex = geminiInstances.length - 1;
    console.log(`[Gemini] 🔄 Starting from last key ${currentKeyIndex + 1}/${geminiInstances.length} (reverse order)`);
  }

  let attempts = 0;
  const startIndex = currentKeyIndex;

  while (attempts < geminiInstances.length) {
    const client = geminiInstances[currentKeyIndex];
    const isFailed = failedKeys.has(currentKeyIndex);

    if (!isFailed) {
      if (attempts > 0) {
        console.log(`[Gemini] Found available key ${currentKeyIndex + 1}/${geminiInstances.length} after skipping ${attempts} failed key(s)`);
      }
      return client;
    }

    currentKeyIndex = currentKeyIndex === 0 ? geminiInstances.length - 1 : currentKeyIndex - 1;
    attempts++;
    if (currentKeyIndex === startIndex && attempts >= geminiInstances.length) {
      break;
    }
  }

  console.warn(`[Gemini] ⚠️  All keys marked as failed, using key ${currentKeyIndex + 1} anyway (last resort)`);
  return geminiInstances[currentKeyIndex];
}

export function markGeminiKeyAsFailed(keyIndex: number): void {
  failedKeys.add(keyIndex);
  const availableCount = geminiInstances.length - failedKeys.size;
  console.log(`[Gemini] ❌ Marked key ${keyIndex + 1}/${geminiInstances.length} as failed. Available keys: ${availableCount}/${geminiInstances.length}`);
  const previousIndex = currentKeyIndex;
  currentKeyIndex = currentKeyIndex === 0 ? geminiInstances.length - 1 : currentKeyIndex - 1;
  if (currentKeyIndex === geminiInstances.length - 1 && previousIndex === 0) {
    console.log(`[Gemini] 🔄 Cycled through all keys, resetting to last key`);
  } else {
    console.log(`[Gemini] ⬅️  Switching to key ${currentKeyIndex + 1}/${geminiInstances.length} (reverse order)`);
  }
}

export function resetGeminiFailedKeys(): void {
  if (failedKeys.size > 0) {
    console.log(`[Gemini] Resetting ${failedKeys.size} failed key(s)`);
    failedKeys.clear();
  }
}

export function getGeminiCurrentKeyIndex(): number {
  return currentKeyIndex;
}

/**
 * Wrapper for `models.generateContent` with automatic failover.
 * Returns an object with `.text` containing the generated string.
 */
export async function generateContentWithFailover(params: any): Promise<{ text: string } > {
  let lastError: any = null;
  initializeGeminiClients();
  const maxAttempts = geminiInstances.length || 1;

  if (maxAttempts === 0) {
    throw new Error("No Gemini API keys configured");
  }

  console.log(`[Gemini] Starting request with ${maxAttempts} available key(s)`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const client = getNextGeminiClient();
    const keyIndex = currentKeyIndex;
    console.log(`[Gemini] Attempt ${attempt + 1}/${maxAttempts}: Using key ${keyIndex + 1}/${geminiInstances.length}`);

    try {
      // The Google GenAI SDK uses `models.generateContent` with `contents` as string
      // Convert messages array to contents format if needed, or use contents directly
      let apiParams: any = { ...params };
      
      // If params has messages array, convert to contents format
      if (apiParams.messages && Array.isArray(apiParams.messages)) {
        // Convert messages array to a single content string
        const systemMessage = apiParams.messages.find((m: any) => m.role === "system");
        const userMessage = apiParams.messages.find((m: any) => m.role === "user");
        
        let contents = "";
        if (systemMessage && userMessage) {
          contents = `${systemMessage.content}\n\nUser: ${userMessage.content}`;
        } else if (userMessage) {
          contents = userMessage.content;
        } else {
          contents = apiParams.messages.map((m: any) => `${m.role}: ${m.content}`).join("\n\n");
        }
        
        apiParams = {
          model: apiParams.model || "gemini-2.5-flash",
          contents: contents,
          temperature: apiParams.temperature,
          maxOutputTokens: apiParams.max_output_tokens || apiParams.maxOutputTokens,
        };
      } else if (apiParams.contents) {
        // Already in the correct format, just ensure maxOutputTokens is set correctly
        apiParams = {
          model: apiParams.model || "gemini-2.5-flash",
          contents: apiParams.contents,
          temperature: apiParams.temperature,
          maxOutputTokens: apiParams.max_output_tokens || apiParams.maxOutputTokens,
        };
      }
      
      const result = await client.models.generateContent(apiParams);

      // Extract text from response - the new SDK returns .text directly
      const text = (result as any)?.text || (result as any)?.response?.text || (result as any)?.output?.[0]?.content?.[0]?.text || JSON.stringify(result);

      if (attempt > 0) {
        failedKeys.delete(keyIndex);
        console.log(`[Gemini] ✅ Key ${keyIndex + 1} recovered, request succeeded on attempt ${attempt + 1}`);
      } else {
        console.log(`[Gemini] ✅ Request succeeded with key ${keyIndex + 1}/${geminiInstances.length}`);
      }

      return { text: String(text) };
    } catch (error: any) {
      lastError = error;
      const errorStatus = error?.status || error?.statusCode || error?.code;
      const errorMessage = error?.message || JSON.stringify(error?.error || {});
      const errorCode = error?.error?.code || error?.code;

      // Retryable errors: rate limits, auth errors, and service unavailable errors
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
        
        console.log(`[Gemini] ⚠️  Key ${keyIndex + 1} failed with status ${errorStatus || errorCode || 'unknown'}: ${errorType}`);
        markGeminiKeyAsFailed(keyIndex);

        if (attempt < maxAttempts - 1) {
          console.log(`[Gemini] 🔄 Retrying with next key (reverse order)...`);
          continue;
        } else {
          console.error(`[Gemini] ❌ All ${maxAttempts} key(s) failed. No more keys to try.`);
        }
      } else {
        console.error(`[Gemini] ❌ Key ${keyIndex + 1} failed with non-skippable error: ${errorMessage || 'Unknown error'}`);
        throw error;
      }
    }
  }

  console.error(`[Gemini] ❌ All ${maxAttempts} key(s) exhausted. Last error: ${lastError?.message || 'Unknown'}`);
  throw lastError || new Error(`All ${maxAttempts} Gemini API key(s) failed`);
}

export function isGeminiConfigured(): boolean {
  const keys = getAllApiKeys();
  return keys.length > 0;
}
