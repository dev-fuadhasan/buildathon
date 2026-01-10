/**
 * YouTube Data API v3 Client
 * Searches for exercise videos based on recommended exercises
 */

// Multi-API key support with auto-failover
let youtubeApiKeys: string[] = [];
let currentKeyIndex = 0;
let failedKeys = new Set<number>();

/**
 * Get all available YouTube API keys from environment
 * Supports: YOUTUBE_API_KEY, YOUTUBE_API_KEY_1, YOUTUBE_API_KEY_2, etc.
 * Or comma-separated: YOUTUBE_API_KEY=key1,key2,key3,...
 */
function getAllApiKeys(): string[] {
  const keys: string[] = [];
  
  // Method 1: Comma-separated in YOUTUBE_API_KEY
  const mainKey = process.env.YOUTUBE_API_KEY;
  if (mainKey && mainKey.trim()) {
    const splitKeys = mainKey.split(',').map(k => k.trim()).filter(k => k && k.length > 0);
    if (splitKeys.length > 0) {
      keys.push(...splitKeys);
      console.log(`[YouTube] Found ${splitKeys.length} key(s) in YOUTUBE_API_KEY (comma-separated)`);
    }
  }
  
  // Method 2: Individual keys YOUTUBE_API_KEY_1, YOUTUBE_API_KEY_2, etc.
  const foundIndividualKeys: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const envVarName = `YOUTUBE_API_KEY_${i}`;
    const key = process.env[envVarName];
    if (key && key.trim() && key.trim().length > 0) {
      const trimmedKey = key.trim();
      foundIndividualKeys.push(trimmedKey);
      keys.push(trimmedKey);
      console.log(`[YouTube] Found ${envVarName}`);
    }
  }
  
  if (foundIndividualKeys.length > 0) {
    console.log(`[YouTube] Found ${foundIndividualKeys.length} individual key(s): YOUTUBE_API_KEY_1 through YOUTUBE_API_KEY_${foundIndividualKeys.length}`);
  }
  
  const uniqueKeys = [...new Set(keys)];
  
  if (uniqueKeys.length === 0) {
    console.warn(`[YouTube] No API keys found! Check environment variables: YOUTUBE_API_KEY or YOUTUBE_API_KEY_1 through YOUTUBE_API_KEY_20`);
  } else {
    console.log(`[YouTube] Total unique API keys found: ${uniqueKeys.length}`);
  }
  
  return uniqueKeys;
}

/**
 * Initialize YouTube API keys
 */
function initializeYouTubeKeys(): void {
  if (youtubeApiKeys.length > 0) {
    console.log(`[YouTube] Already initialized with ${youtubeApiKeys.length} key(s)`);
    return;
  }
  
  console.log(`[YouTube] Initializing... Checking environment variables...`);
  const apiKeys = getAllApiKeys();
  
  if (apiKeys.length === 0) {
    console.warn(`[YouTube] No keys found, YouTube video recommendations will be disabled`);
    return;
  }
  
  youtubeApiKeys = apiKeys;
  currentKeyIndex = youtubeApiKeys.length > 0 ? youtubeApiKeys.length - 1 : 0;
  failedKeys.clear();
  
  console.log(`[YouTube] ✅ Successfully initialized ${youtubeApiKeys.length} API key(s)`);
  if (youtubeApiKeys.length > 1) {
    console.log(`[YouTube] 🔄 Will start from last key ${currentKeyIndex + 1}/${youtubeApiKeys.length} (reverse order)`);
  }
}

/**
 * Get next available API key (with failover)
 */
function getNextApiKey(): string | null {
  if (youtubeApiKeys.length === 0) {
    initializeYouTubeKeys();
  }
  
  if (youtubeApiKeys.length === 0) {
    return null;
  }
  
  // Try current key first
  if (!failedKeys.has(currentKeyIndex)) {
    return youtubeApiKeys[currentKeyIndex];
  }
  
  // Find next available key
  for (let i = 0; i < youtubeApiKeys.length; i++) {
    const index = (currentKeyIndex + i) % youtubeApiKeys.length;
    if (!failedKeys.has(index)) {
      currentKeyIndex = index;
      return youtubeApiKeys[index];
    }
  }
  
  // All keys failed, reset and try again
  console.warn(`[YouTube] All keys failed, resetting...`);
  failedKeys.clear();
  currentKeyIndex = youtubeApiKeys.length > 0 ? youtubeApiKeys.length - 1 : 0;
  return youtubeApiKeys[currentKeyIndex] || null;
}

export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  duration?: string;
  viewCount?: string;
  publishedAt?: string;
}

/**
 * Search YouTube for exercise videos
 * @param exerciseText - The exercise recommendation text (e.g., "15-minute gentle walk, 10 minutes of prenatal yoga")
 * @param maxResults - Maximum number of videos to return (default: 3)
 * @returns Array of YouTube videos
 */
export async function searchExerciseVideos(
  exerciseText: string,
  maxResults: number = 3
): Promise<YouTubeVideo[]> {
  try {
    if (youtubeApiKeys.length === 0) {
      initializeYouTubeKeys();
    }
    
    const apiKey = getNextApiKey();
    if (!apiKey) {
      console.warn(`[YouTube] No API key available, skipping video search`);
      return [];
    }
    
    // Extract key exercise keywords from the exercise text
    // Focus on prenatal/pregnancy-safe exercises
    const keywords = extractExerciseKeywords(exerciseText);
    const searchQuery = `pregnancy exercise ${keywords} prenatal safe`;
    
    console.log(`[YouTube] Searching for: "${searchQuery}"`);
    
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('q', searchQuery);
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('maxResults', maxResults.toString());
    searchUrl.searchParams.set('order', 'relevance');
    searchUrl.searchParams.set('videoCategoryId', '26'); // Howto & Style category
    searchUrl.searchParams.set('key', apiKey);
    
    const searchResponse = await fetch(searchUrl.toString());
    
    if (!searchResponse.ok) {
      const errorData = await searchResponse.json().catch(() => ({}));
      console.error(`[YouTube] Search failed:`, errorData);
      
      // Mark key as failed if quota exceeded or invalid
      if (errorData.error?.errors?.[0]?.reason === 'quotaExceeded' || 
          errorData.error?.errors?.[0]?.reason === 'keyInvalid') {
        failedKeys.add(currentKeyIndex);
        console.warn(`[YouTube] Key ${currentKeyIndex + 1} failed, will try next key`);
        
        // Try next key if available
        if (youtubeApiKeys.length > 1) {
          const nextKey = getNextApiKey();
          if (nextKey && nextKey !== apiKey) {
            console.log(`[YouTube] Retrying with next key...`);
            return searchExerciseVideos(exerciseText, maxResults);
          }
        }
      }
      
      return [];
    }
    
    const searchData = await searchResponse.json();
    
    if (!searchData.items || searchData.items.length === 0) {
      console.log(`[YouTube] No videos found for: "${searchQuery}"`);
      return [];
    }
    
    // Get video details (duration, view count, etc.)
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
    
    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    detailsUrl.searchParams.set('part', 'contentDetails,statistics,snippet');
    detailsUrl.searchParams.set('id', videoIds);
    detailsUrl.searchParams.set('key', apiKey);
    
    const detailsResponse = await fetch(detailsUrl.toString());
    const detailsData = detailsResponse.ok ? await detailsResponse.json() : { items: [] };
    
    // Combine search and details data
    const videos: YouTubeVideo[] = searchData.items.map((item: any, index: number) => {
      const details = detailsData.items?.[index];
      
      return {
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
        channelTitle: item.snippet.channelTitle,
        duration: details?.contentDetails?.duration,
        viewCount: details?.statistics?.viewCount,
        publishedAt: item.snippet.publishedAt,
      };
    });
    
    console.log(`[YouTube] ✅ Found ${videos.length} video(s) for exercise: "${keywords}"`);
    return videos;
    
  } catch (error: any) {
    console.error(`[YouTube] Error searching for videos:`, error.message);
    return [];
  }
}

/**
 * Extract key exercise keywords from exercise text
 */
function extractExerciseKeywords(exerciseText: string): string {
  // Common exercise keywords
  const exerciseKeywords = [
    'walk', 'walking', 'yoga', 'stretching', 'breathing', 'pilates',
    'swimming', 'dance', 'aerobics', 'strength', 'cardio', 'meditation',
    'relaxation', 'flexibility', 'balance', 'posture', 'pelvic', 'kegel'
  ];
  
  const lowerText = exerciseText.toLowerCase();
  const foundKeywords: string[] = [];
  
  for (const keyword of exerciseKeywords) {
    if (lowerText.includes(keyword)) {
      foundKeywords.push(keyword);
    }
  }
  
  // If no keywords found, use first few words
  if (foundKeywords.length === 0) {
    const words = exerciseText.split(/\s+/).slice(0, 3);
    return words.join(' ');
  }
  
  return foundKeywords.slice(0, 3).join(' ');
}

/**
 * Reset YouTube clients (useful if env vars changed)
 */
export function resetYouTubeClients(): void {
  console.log(`[YouTube] 🔄 Force resetting YouTube clients...`);
  youtubeApiKeys = [];
  currentKeyIndex = 0;
  failedKeys.clear();
  initializeYouTubeKeys();
}

// Initialize on module load
if (typeof window === 'undefined') {
  // Server-side only
  initializeYouTubeKeys();
}

