import { NextRequest, NextResponse } from "next/server";
import { askMomsCare } from "@/lib/momsCareChat";
import { getUserFromRequest } from "@/lib/auth";
import { getChatHistory, updateChatHistory, ChatMessage } from "@/lib/data";
import { checkSafety } from "@/lib/safetyGuardrails";
import { detectLanguage, translateToEnglish, translateToBangla } from "@/lib/translation";
import { semanticSearchServer as semanticSearchWithFallback } from "@/lib/supabaseSemanticSearchServer";

// Format search results for context
function formatSearchResultsForContext(results: any[]): string {
  if (results.length === 0) return '';
  return results
    .map(r => `Q: ${r.question}\nA: ${r.answer}`)
    .join('\n---\n');
}

// Increase timeout for chat API (120 seconds for batch processing)
export const maxDuration = 120;

// Helper to clean and deduplicate messages
function cleanMessages(messages: Array<{ role: string; content: string }>): Array<{ role: string; content: string }> {
  const cleaned: Array<{ role: string; content: string }> = [];
  let lastContent = "";
  
  for (const msg of messages) {
    const content = (msg.content || "").trim();
    
    // Skip empty messages
    if (!content) continue;
    
    // Skip duplicate consecutive messages (same role and content)
    if (content === lastContent && msg.role === cleaned[cleaned.length - 1]?.role) {
      continue;
    }
    
    // Skip if this assistant message is identical to the previous one
    if (msg.role === "assistant" && cleaned.length > 0 && cleaned[cleaned.length - 1].role === "assistant") {
      if (content === cleaned[cleaned.length - 1].content) {
        continue;
      }
    }
    
    cleaned.push({ role: msg.role, content });
    lastContent = content;
  }
  
  return cleaned;
}

// Helper to limit conversation history to prevent token overflow
function limitConversationHistory(
  messages: Array<{ role: string; content: string }>,
  maxMessages: number = 20
): Array<{ role: string; content: string }> {
  // Always keep the first message if it's a system/assistant greeting
  // Keep the last maxMessages messages
  if (messages.length <= maxMessages) {
    return messages;
  }
  
  // Keep first message if it's an assistant greeting
  const firstMessage = messages[0];
  const isGreeting = firstMessage?.role === "assistant" && 
    (firstMessage.content.includes("Hi") || firstMessage.content.includes("হাই") || 
     firstMessage.content.includes("MomsCare") || firstMessage.content.includes("assistant"));
  
  if (isGreeting) {
    return [firstMessage, ...messages.slice(-(maxMessages - 1))];
  }
  
  return messages.slice(-maxMessages);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let messages = body.messages || [];
    const imageUrl = body.imageUrl || null; // Optional image URL
    const clientContext = body.context || null; // ✅ NEW: Context from client-side semantic search
    const clientEmbedding: number[] | null = Array.isArray(body.embedding) ? body.embedding : null; // ✅ NEW: Optional client-provided 384-d embedding

    // ⚠️  OPTIONAL: client embedding is now optional (soft requirement)
    // If Xenova fails on client, chat still works but without semantic search
    if (clientEmbedding && (!Array.isArray(clientEmbedding) || clientEmbedding.length !== 384)) {
      console.warn('[Chat API] ⚠️ Invalid embedding format provided (expected 384-d array), ignoring');
    }
    
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }
    
    // ✅ NEW: Log client-side context for debugging
    if (clientContext) {
      console.log("[Client-Side Embeddings] Received semantic search context from browser");
    }
    
    // ⚠️ LOG: Check if embedding was provided
    if (clientEmbedding && Array.isArray(clientEmbedding) && clientEmbedding.length === 384) {
      console.log('[Chat API] ✅ Client embedding available (384-d) - will use semantic search');
    } else {
      console.log('[Chat API] ⚠️ Client embedding unavailable - using keyword-only search as fallback');
    }

    // Check if user is logged in
    const user = await getUserFromRequest(req);
    const isLoggedIn = user?.role === "mother";
    
    // ============================================================
    // LOGGED-OUT USER (GUEST MODE) - Start fresh session
    // ============================================================
    if (!isLoggedIn) {
      // For logged-out users: Use only current session messages
      // No history, no profile, no personalization
      messages = cleanMessages(messages);
      messages = limitConversationHistory(messages, 18);
      
      // Get the last user message
      const lastUserMessage = messages
        .filter((m: any) => m.role === "user")
        .pop()?.content || "";
      
      if (!lastUserMessage.trim()) {
        return NextResponse.json(
          { error: "User message is required" },
          { status: 400 }
        );
      }
      
      // Detect language (for safety check only)
      const userLanguage = detectLanguage(lastUserMessage);
      
      // Translate only for safety check (safety check needs English)
      let translatedUserMessage = lastUserMessage;
      if (userLanguage === "bn") {
        try {
          translatedUserMessage = await translateToEnglish(lastUserMessage);
        } catch (error) {
          translatedUserMessage = lastUserMessage;
        }
      }
      
      // Safety check (uses translated message)
      const safetyCheck = checkSafety(translatedUserMessage, undefined);
      
      if (safetyCheck.requiresEmergency) {
        const emergencyMessage = `${safetyCheck.recommendation}\n\nPlease seek immediate medical attention. This is a medical emergency.`;
        const finalReply = userLanguage === "bn" 
          ? await translateToBangla(emergencyMessage).catch(() => emergencyMessage)
          : emergencyMessage;
        
        return NextResponse.json({
          reply: finalReply,
          safetyWarning: true,
          riskLevel: safetyCheck.riskLevel,
        });
      }

      // ✅ VECTOR SEARCH (for guests)
      let semanticContext = "";
      // If the browser provided an embedding, prefer it (no server-side HF/Xenova)
      if (clientEmbedding && Array.isArray(clientEmbedding) && clientEmbedding.length === 384) {
        try {
          console.log("[💬 CHAT API] ℹ️ Received client embedding (384d) - using for Supabase RPC search");
          const searchResults = await semanticSearchWithFallback(lastUserMessage, {
            minSimilarity: 0.25,
            maxResults: 3,
          }, clientEmbedding);
          semanticContext = formatSearchResultsForContext(searchResults);
          console.log(`[💬 CHAT API] ✅ Found ${searchResults.length} search results for context (client embedding)`);
        } catch (err) {
          console.error("[💬 CHAT API] ❌ Vector search (client embedding) failed:", err);
          console.log("[💬 CHAT API] Continuing without semantic context (system is resilient)");
        }
      } else if (!clientContext) {
        // Only search if client didn't already do it
        try {
          console.log("\n" + "=".repeat(70));
          console.log("[💬 CHAT API] 🔍 Performing Supabase vector search for GUEST user");
          console.log("[💬 CHAT API] Query:", lastUserMessage.substring(0, 100));
          const searchResults = await semanticSearchWithFallback(lastUserMessage, {
            minSimilarity: 0.25,
            maxResults: 3,
          }, null);
          semanticContext = formatSearchResultsForContext(searchResults);
          console.log(`[💬 CHAT API] ✅ Found ${searchResults.length} search results for context`);
          if (semanticContext) {
            console.log(`[💬 CHAT API] Context length: ${semanticContext.length} chars`);
          }
          console.log("=".repeat(70) + "\n");
        } catch (err) {
          console.error("[💬 CHAT API] ❌ Vector search failed:", err);
          console.log("[💬 CHAT API] Continuing without semantic context (system is resilient)");
          console.log("=".repeat(70) + "\n");
          // Continue without semantic context - system is resilient
        }
      } else {
        console.log("[💬 CHAT API] ℹ️  Using client-provided semantic context");
      }
      
      // Get AI response (no profile context for guests)
      let reply: string;
      try {
        const timeoutPromise = new Promise<string>((_, reject) => {
          setTimeout(() => reject(new Error("Request timeout")), 55000);
        });
        
        // Prepare image URLs array
        const imageUrls = imageUrl ? [imageUrl] : [];
        
        // Pass translated message to avoid duplicate translation in askMomsCare
        let extraContexts: any = userLanguage === "bn" && translatedUserMessage !== lastUserMessage
          ? { translatedQuery: translatedUserMessage }
          : {};
        
        // Include semantic search context (from Supabase or client)
        if (semanticContext) {
          extraContexts.semanticContext = semanticContext;
          console.log("[Chat API] Included Supabase semantic context");
        }
        
        // Send messages directly to AI in original language
        reply = await Promise.race([
          askMomsCare(messages, undefined, imageUrls, undefined, false, false, extraContexts),
          timeoutPromise
        ]) as string;
        
        reply = reply.trim();
        
        if (!reply || reply.length < 3) {
          throw new Error("Empty response from AI");
        }
      } catch (error: any) {
        console.error("AI chat error:", error);
        const errorMessage = userLanguage === "bn"
          ? "দুঃখিত, একটি সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।"
          : "Sorry, something went wrong. Please try again in a moment.";
        
        return NextResponse.json({
          reply: errorMessage,
          safetyWarning: false,
          riskLevel: "low",
        });
      }
      
      // Add safety warnings if needed
      if (safetyCheck.riskLevel === "high" && safetyCheck.recommendation) {
        reply = `${safetyCheck.recommendation}\n\n${reply}`;
      } else if (safetyCheck.riskLevel === "medium" && safetyCheck.recommendation) {
        reply = `${safetyCheck.recommendation}\n\n${reply}`;
      }
      
      // AI responds directly in user's language (no translation needed)
      // DO NOT store chat history for logged-out users
      return NextResponse.json({
        reply: reply.trim(),
        safetyWarning: safetyCheck.riskLevel !== "low",
        riskLevel: safetyCheck.riskLevel,
      });
    }
    
    // ============================================================
    // LOGGED-IN MOTHER (AI-POWERED PERSONALIZED MODE)
    // ============================================================
    
    // Clean and limit current session messages
    messages = cleanMessages(messages);
    messages = limitConversationHistory(messages, 15);
    
    const currentUserMessage = messages
      .filter((m: any) => m.role === "user")
      .pop()?.content || "";
    
    if (!currentUserMessage.trim()) {
      return NextResponse.json(
        { error: "User message is required" },
        { status: 400 }
      );
    }
    
    // Detect language
    const userLanguage = detectLanguage(currentUserMessage);
    
    // Safety check (on original message + image context)
    const hasImage = imageUrl !== null && imageUrl !== undefined;
    const safetyCheck = checkSafety(currentUserMessage, undefined, hasImage);
    
    if (safetyCheck.requiresEmergency) {
      const emergencyMessage = `${safetyCheck.recommendation}\n\nPlease seek immediate medical attention. This is a medical emergency.`;
      const finalReply = userLanguage === "bn" 
        ? await translateToBangla(emergencyMessage).catch(() => emergencyMessage)
        : emergencyMessage;
      
      return NextResponse.json({
        reply: finalReply,
        safetyWarning: true,
        riskLevel: safetyCheck.riskLevel,
      });
    }
    
    // STEP 1: Classify question to determine which data is needed
    const { classifyQuestion, filterContext: filterContextByType } = await import("@/lib/questionClassifier");
    const { isPersonalQuestion } = await import("@/lib/chatHelper");
    
    const questionClassification = classifyQuestion(currentUserMessage);
    const isPersonal = await isPersonalQuestion(currentUserMessage);
    
    console.log(`[Question Classification] Type: ${questionClassification.primary}${questionClassification.secondary ? ` + ${questionClassification.secondary}` : ''}, Personal: ${isPersonal}`);
    console.log(`[Question Classification] Question: "${currentUserMessage.substring(0, 100)}..."`);
    
    // STEP 2: Load ALL data types separately
    // CRITICAL FIX: Load prescriptions even for general questions if they mention prescriptions/reports
    let rawProfileData: string | undefined = undefined;
    let rawDailyData: string | undefined = undefined;
    let rawDoctorQAData: string | undefined = undefined;
    let allPrescriptionUrls: string[] = [];
    let weeksPregnant: number | undefined;
    
    // Check if question mentions prescriptions/reports (needed for loading prescriptions)
    const questionLower = currentUserMessage.toLowerCase();
    const mentionsPrescriptions = questionLower.includes("prescription") || 
                                  questionLower.includes("report") ||
                                  questionLower.includes("প্রেসক্রিপশন") ||
                                  questionLower.includes("রিপোর্ট") ||
                                  questionLower.includes("summary") ||
                                  questionLower.includes("summarize") ||
                                  questionLower.includes("analyze");
    
    // Load prescriptions if personal question OR if question mentions prescriptions
    const shouldLoadPrescriptions = isPersonal || mentionsPrescriptions;
    
    if (isPersonal) {
      console.log("[Data Loading] Personal question - loading all data types...");
    } else if (mentionsPrescriptions) {
      console.log("[Data Loading] Question mentions prescriptions/reports - loading prescriptions even though not personal...");
    }
    
    if (shouldLoadPrescriptions || isPersonal) {
      
      try {
        const { getMother, listDailyEntries, listMotherQuestions } = await import("@/lib/data");
        const { listObjects, signedUrl } = await import("@/lib/r2Client");
        const { getCurrentDateInTimezone } = await import("@/lib/pregnancyTracker");
        
        const mother = await getMother(user!.id);
        if (mother) {
          const daysPregnant = mother.daysPregnant || (mother.weeksPregnant ? mother.weeksPregnant * 7 : undefined);
          const weeks = daysPregnant ? Math.floor(daysPregnant / 7) : mother.weeksPregnant;
          const months = weeks ? Math.round(weeks / 4.33) : undefined;
          
          // Build PROFILE data (basic info only)
          const profileParts: string[] = [];
          profileParts.push("=== HEALTH PROFILE ===");
          if (mother.name) profileParts.push(`Full Name: ${mother.name}`);
          if (mother.email) profileParts.push(`Email: ${mother.email}`);
          if (mother.age) profileParts.push(`Age: ${mother.age}`);
          if (daysPregnant) profileParts.push(`Days Pregnant: ${daysPregnant} days (${weeks} weeks, ${months} months)`);
          if (mother.phone) profileParts.push(`Phone: ${mother.phone}`);
          if (mother.bloodGroup) profileParts.push(`Blood Group: ${mother.bloodGroup}`);
          if (mother.previousPregnancies !== undefined) profileParts.push(`Previous Pregnancies: ${mother.previousPregnancies}`);
          if (mother.address) profileParts.push(`Address: ${mother.address}`);
          if (mother.dueDate) profileParts.push(`Due Date: ${mother.dueDate}`);
          if (mother.conditions) profileParts.push(`Medical Conditions: ${mother.conditions}`);
          if (mother.allergies) profileParts.push(`Allergies: ${mother.allergies}`);
          if (mother.medications) profileParts.push(`Current Medications: ${mother.medications}`);
          if (mother.emergencyContact) profileParts.push(`Emergency Contact Name: ${mother.emergencyContact}`);
          if (mother.emergencyPhone) profileParts.push(`Emergency Contact Phone: ${mother.emergencyPhone}`);
          rawProfileData = profileParts.join("\n");
          weeksPregnant = weeks;
          
          // Build DAILY ENTRIES data (separate)
          try {
            const dailyEntries = await listDailyEntries(user!.id);
            const today = getCurrentDateInTimezone(mother.timezone || "Asia/Dhaka");
            const recentEntries = dailyEntries
              .filter(entry => entry.date === today || entry.date >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 10);
            
            if (recentEntries.length > 0) {
              const dailyParts: string[] = ["=== RECENT DAILY ENTRIES ==="];
              recentEntries.forEach((entry, idx) => {
                dailyParts.push(`${idx + 1}. [${entry.date}] ${entry.entry}`);
              });
              rawDailyData = dailyParts.join("\n");
            }
          } catch (err) {
            console.error("Failed to load daily entries:", err);
          }
          
          // Build DOCTOR Q&A data (separate)
          try {
            const questions = await listMotherQuestions(user!.id);
            const recentQAs = questions
              .filter(q => q.answer)
              .sort((a, b) => new Date(b.answeredAt || b.createdAt).getTime() - new Date(a.answeredAt || a.createdAt).getTime())
              .slice(0, 5);
            
            if (recentQAs.length > 0) {
              const doctorQAParts: string[] = ["=== RECENT DOCTOR Q&A ==="];
              recentQAs.forEach((qa, idx) => {
                doctorQAParts.push(`${idx + 1}. Q: ${qa.question}`);
                doctorQAParts.push(`   A: ${qa.answer}`);
              });
              rawDoctorQAData = doctorQAParts.join("\n");
            }
          } catch (err) {
            console.error("Failed to load doctor Q&A:", err);
          }
          
          // Load prescriptions
          // CRITICAL: PDFs are converted to images, so we ONLY load image files (not PDFs)
          // This includes:
          // 1. Direct image uploads (.png, .jpg, .jpeg)
          // 2. Converted PDF pages (stored as {filename}_page{number}.jpg)
          try {
            const prefix = `prescriptions/${user!.id}/`;
            const objects = await listObjects(prefix);
            
            console.log(`[Chat] Found ${objects?.length || 0} total objects in prescriptions/${user!.id}/`);
            
            // Log all object keys for debugging
            if (objects && objects.length > 0) {
              console.log(`[Chat] All object keys found:`);
              objects.forEach((obj, idx) => {
                console.log(`[Chat]   ${idx + 1}. ${obj.Key} (${obj.Key?.endsWith('.pdf') ? 'PDF' : obj.Key?.match(/\.(jpg|jpeg|png)$/i) ? 'IMAGE' : 'OTHER'})`);
              });
            }
            
            // Filter to get ONLY image files - exclude PDFs and metadata.json
            // Include: .png, .jpg, .jpeg files (both direct uploads AND converted PDF pages like _page1.jpg, _page2.jpg)
            const imageObjects = (objects || []).filter(obj => {
              const key = obj.Key || "";
              
              // Explicitly exclude PDF files and metadata
              if (key.includes('metadata.json') || key.endsWith('.pdf')) {
                return false;
              }
              
              // Explicitly include ALL image files (direct uploads + converted PDF pages)
              const isImage = key.endsWith('.png') || 
                             key.endsWith('.jpg') || 
                             key.endsWith('.jpeg') ||
                             key.endsWith('.PNG') ||
                             key.endsWith('.JPG') ||
                             key.endsWith('.JPEG');
              
              return isImage;
            });
            
            console.log(`[Chat] Filtered to ${imageObjects.length} image file(s) (excluding PDFs and metadata)`);
            
            if (imageObjects.length > 0) {
              console.log(`[Chat] Image file keys:`);
              imageObjects.forEach((obj, idx) => {
                console.log(`[Chat]   ${idx + 1}. ${obj.Key}`);
              });
            }
            
            // Sort by most recent and limit to 30 images (to handle multiple PDFs with many pages)
            const recentImages = imageObjects
              .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))
              .slice(0, 30);
            
            console.log(`[Chat] Selected ${recentImages.length} most recent image(s) for AI analysis`);
            
            // Generate signed URLs for all images
            const urlPromises = recentImages.map(async (obj) => {
              try {
                const url = await signedUrl(obj.Key!);
                console.log(`[Chat] ✅ Generated signed URL for: ${obj.Key} -> ${url.substring(0, 100)}...`);
                return url;
              } catch (urlError: any) {
                console.error(`[Chat] ❌ Failed to generate signed URL for ${obj.Key}:`, urlError.message);
                return null;
              }
            });
            
            const urlResults = await Promise.all(urlPromises);
            
            // Filter out any null URLs (failed to generate)
            allPrescriptionUrls = urlResults.filter((url): url is string => url !== null);
            
            console.log(`[Chat] ✅ Successfully loaded ${allPrescriptionUrls.length} prescription image URL(s) for AI analysis`);
            if (allPrescriptionUrls.length > 0) {
              console.log(`[Chat] First 5 prescription URLs:`);
              allPrescriptionUrls.slice(0, 5).forEach((url, idx) => {
                console.log(`[Chat]   ${idx + 1}. ${url.substring(0, 150)}...`);
              });
            } else {
              console.log(`[Chat] ⚠️ WARNING: No prescription image URLs generated! This means AI cannot access prescriptions.`);
            }
          } catch (err) {
            console.error("[Chat] ❌ CRITICAL ERROR: Failed to fetch prescriptions:", err);
            console.error("[Chat] Error details:", {
              message: (err as any)?.message,
              stack: (err as any)?.stack,
              name: (err as any)?.name,
            });
          }
          
          // Add chat image if provided
          if (imageUrl) {
            allPrescriptionUrls.push(imageUrl);
          }
        }
      } catch (err) {
        console.error("Failed to fetch mother data:", err);
      }
    } else {
      // For GENERAL questions, only add chat image if provided
      if (imageUrl) {
        allPrescriptionUrls = [imageUrl];
      }
      console.log("[Data Loading] General question - skipping data load");
    }
    
    // STEP 3: Filter data based on question classification
    const filteredData = filterContextByType(questionClassification, {
      profile: rawProfileData,
      prescriptions: allPrescriptionUrls,
      daily: rawDailyData,
      doctorQA: rawDoctorQAData,
    });
    
    // CRITICAL FIX: If question mentions prescriptions/reports and we have prescription URLs,
    // ALWAYS include them (even if classifier said something else or question isn't personal)
    // CRITICAL: Always include prescriptions if question mentions them AND user is logged in
    if (mentionsPrescriptions) {
      if (allPrescriptionUrls.length > 0) {
        filteredData.filteredPrescriptions = allPrescriptionUrls;
        console.log(`[🔧 OVERRIDE] Question mentions prescriptions/reports - forcing inclusion of ${allPrescriptionUrls.length} prescription image(s)`);
      } else {
        console.log(`[⚠️ OVERRIDE] Question mentions prescriptions but NO prescription images found!`);
        console.log(`[⚠️ DEBUG] This means user has no prescriptions uploaded or they failed to load.`);
        console.log(`[⚠️ DEBUG] User ID: ${user!.id}, Prefix: prescriptions/${user!.id}/`);
      }
    }
    
    // STEP 4: Use ONLY filtered data
    const profileContext = filteredData.filteredProfile;
    const prescriptionUrls = filteredData.filteredPrescriptions || [];
    const dailyContext = filteredData.filteredDaily;
    const doctorQAContext = filteredData.filteredDoctorQA;
    
    console.log(`[✅ FILTERED DATA] Profile: ${!!profileContext}, Prescriptions: ${prescriptionUrls.length}, Daily: ${!!dailyContext}, DoctorQA: ${!!doctorQAContext}`);
    console.log(`[✅ FILTERED DATA] Question classification: ${questionClassification.primary}, Mentions prescriptions: ${mentionsPrescriptions}, Is personal: ${isPersonal}`);
    console.log(`[✅ FILTERED DATA] All prescription URLs loaded: ${allPrescriptionUrls.length}`);
    
    if (prescriptionUrls.length > 0) {
      console.log(`[✅ PRESCRIPTIONS] Will send ${prescriptionUrls.length} prescription image(s) to AI for analysis`);
      console.log(`[✅ PRESCRIPTIONS] First 3 URLs:`);
      prescriptionUrls.slice(0, 3).forEach((url, idx) => {
        console.log(`[✅ PRESCRIPTIONS]   ${idx + 1}. ${url.substring(0, 150)}...`);
      });
    } else {
      console.log(`[⚠️ PRESCRIPTIONS] ⚠️⚠️⚠️ NO PRESCRIPTION IMAGES WILL BE SENT TO AI ⚠️⚠️⚠️`);
      console.log(`[⚠️ DEBUG] Question mentions prescriptions: ${mentionsPrescriptions}`);
      console.log(`[⚠️ DEBUG] Is personal: ${isPersonal}`);
      console.log(`[⚠️ DEBUG] All prescription URLs loaded: ${allPrescriptionUrls.length}`);
      console.log(`[⚠️ DEBUG] Filtered prescription URLs: ${prescriptionUrls.length}`);
      console.log(`[⚠️ DEBUG] Question classification primary: ${questionClassification.primary}`);
    }
    
    // Get AI response with ONLY relevant filtered data
    let reply: string;
    try {
      // Increase timeout for batch processing (batches can take longer)
      const hasManyImages = prescriptionUrls && prescriptionUrls.length > 5;
      const timeoutMs = hasManyImages ? 110000 : 30000; // 110s for batch processing, 30s for single requests
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), timeoutMs);
      });

      // ✅ VECTOR SEARCH (for logged-in users)
      let semanticContext = "";
      // If client provided embedding prefer that
      if (clientEmbedding && Array.isArray(clientEmbedding) && clientEmbedding.length === 384) {
        try {
          console.log('[💬 CHAT API] ℹ️ Received client embedding (384d) for logged-in user - using for Supabase RPC search');
          const searchResults = await semanticSearchWithFallback(currentUserMessage, {
            minSimilarity: 0.25,
            maxResults: 3,
          }, clientEmbedding);
          semanticContext = formatSearchResultsForContext(searchResults);
          console.log(`[💬 CHAT API] ✅ Found ${searchResults.length} search results for context (client embedding)`);
        } catch (err) {
          console.error('[💬 CHAT API] ❌ Vector search (client embedding) failed:', err);
          console.log('[💬 CHAT API] Continuing without semantic context (system is resilient)');
        }
      } else if (!clientContext) {
        // Only search if client didn't already do it
        try {
          console.log("\n" + "=".repeat(70));
          console.log("[💬 CHAT API] 🔍 Performing Supabase vector search for LOGGED-IN user");
          console.log("[💬 CHAT API] Query:", currentUserMessage.substring(0, 100));
          const searchResults = await semanticSearchWithFallback(currentUserMessage, {
            minSimilarity: 0.25,
            maxResults: 3,
          }, null);
          semanticContext = formatSearchResultsForContext(searchResults);
          console.log(`[💬 CHAT API] ✅ Found ${searchResults.length} search results for context`);
          if (semanticContext) {
            console.log(`[💬 CHAT API] Context length: ${semanticContext.length} chars`);
          }
          console.log("=".repeat(70) + "\n");
        } catch (err) {
          console.error("[💬 CHAT API] ❌ Vector search failed:", err);
          console.log("[💬 CHAT API] Continuing without semantic context (system is resilient)");
          console.log("=".repeat(70) + "\n");
          // Continue without semantic context - system is resilient
        }
      } else {
        semanticContext = clientContext;
        console.log("[Chat API] Using client-provided semantic context");
      }
      
      // ✅ Include semantic context with other contexts
      const extraContext = {
        dailyContext,
        doctorQAContext,
        motherId: user!.id,
      };
      
      if (semanticContext) {
        (extraContext as any).semanticContext = semanticContext;
        console.log("[Chat API] Included Supabase semantic context for logged-in user");
      }
      
      reply = await Promise.race([
        askMomsCare(messages, profileContext, prescriptionUrls, weeksPregnant, isPersonal, true, extraContext),
        timeoutPromise
      ]) as string;
      
      reply = reply.trim();
      
      if (!reply || reply.length < 3) {
        throw new Error("Empty response from AI");
      }
      
    } catch (error: any) {
      console.error("AI chat error:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      
      if (error.message && (error.message.includes("token") || error.message.includes("length") || error.message.includes("limit"))) {
        const errorMessage = userLanguage === "bn"
          ? "আপনার প্রশ্নটি খুব দীর্ঘ। অনুগ্রহ করে একটি ছোট প্রশ্ন করুন।"
          : "Your question is too long. Please ask a shorter question.";
        
        return NextResponse.json({
          reply: errorMessage,
          safetyWarning: false,
          riskLevel: "low",
        });
      }
      
      // Check for API key or configuration errors
      if (error.message && (error.message.includes("API") || error.message.includes("configured") || error.message.includes("key"))) {
        const errorMessage = userLanguage === "bn"
          ? "সিস্টেম কনফিগারেশন সমস্যা। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।"
          : "System configuration issue. Please try again in a moment.";
        
        return NextResponse.json({
          reply: errorMessage,
          safetyWarning: false,
          riskLevel: "low",
        });
      }
      
      // Check for rate limiting
      if (error.message && (error.message.includes("rate limit") || error.message.includes("busy"))) {
        const errorMessage = userLanguage === "bn"
          ? "সার্ভিস ব্যস্ত। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।"
          : "Service is busy. Please try again in a moment.";
        
        return NextResponse.json({
          reply: errorMessage,
          safetyWarning: false,
          riskLevel: "low",
        });
      }
      
      // Check for timeout errors
      if (error.message && (error.message.includes("timeout") || error.message.includes("too long"))) {
        const errorMessage = userLanguage === "bn"
          ? "আপনার প্রশ্নের উত্তর পেতে একটু বেশি সময় লাগছে। অনুগ্রহ করে একটি ছোট প্রশ্ন করুন বা কিছুক্ষণ পর আবার চেষ্টা করুন।"
          : "Your question is taking too long to answer. Please ask a shorter question or try again in a moment.";
        
        return NextResponse.json({
          reply: errorMessage,
          safetyWarning: false,
          riskLevel: "low",
        });
      }
      
      // Generic error message with more helpful info
      const errorMessage = userLanguage === "bn"
        ? "দুঃখিত, একটি সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।"
        : "Sorry, something went wrong. Please try again in a moment.";
      
      return NextResponse.json({
        reply: errorMessage,
        safetyWarning: false,
        riskLevel: "low",
      });
    }
    
    // Add safety warnings if needed
    if (safetyCheck.riskLevel === "high" && safetyCheck.recommendation) {
      reply = `${safetyCheck.recommendation}\n\n${reply}`;
    } else if (safetyCheck.riskLevel === "medium" && safetyCheck.recommendation) {
      reply = `${safetyCheck.recommendation}\n\n${reply}`;
    }
    
    // Prepare response FIRST (for speed)
    const responseData = {
      reply: reply.trim(),
      safetyWarning: safetyCheck.riskLevel !== "low",
      riskLevel: safetyCheck.riskLevel,
    };
    
    // Save chat history in background (don't wait)
    // Fire-and-forget: save after response is sent
    const saveHistory = async () => {
      try {
        // Load previous history
        let previousHistory: ChatMessage[] = [];
        try {
          const history = await getChatHistory(user!.id);
          if (history?.messages) {
            previousHistory = history.messages;
          }
        } catch (err) {
          console.error("Failed to load previous history:", err);
        }
        
        // Merge previous + current session messages
        const allMessages = [...previousHistory, ...messages];
        const cleanedMessages = cleanMessages(allMessages);
        const limitedMessages = limitConversationHistory(cleanedMessages, 20);
        
        const updatedMessages: ChatMessage[] = limitedMessages.map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: new Date().toISOString(),
        }));
        
        // Add the new assistant response
        updatedMessages.push({
          role: "assistant",
          content: reply.trim(),
          timestamp: new Date().toISOString(),
        });
        
        await updateChatHistory(user!.id, updatedMessages);
        console.log(`[History] Saved ${updatedMessages.length} messages for user ${user!.id}`);
      } catch (err) {
        console.error("Failed to save chat history:", err);
      }
    };
    
    // Trigger save in background (don't await)
    saveHistory();
    
    // Return response immediately
    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Chat API error:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to process chat request",
        message: error.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}

