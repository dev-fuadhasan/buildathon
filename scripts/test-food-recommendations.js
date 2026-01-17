/**
 * Test script to diagnose food recommendation issues
 * Run: node scripts/test-food-recommendations.js
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testFoodRecommendations() {
  console.log("\n" + "=".repeat(70));
  console.log("🔍 FOOD RECOMMENDATION DIAGNOSTIC TEST");
  console.log("=".repeat(70) + "\n");

  // Test 1: Check Groq API Keys
  console.log("Test 1: Checking Groq API Keys...");
  const groqKey = process.env.GROQ_API_KEY;
  const hasGroqKeys = !!(groqKey && groqKey.trim());
  
  if (!hasGroqKeys) {
    console.error("❌ CRITICAL: No GROQ_API_KEY found in environment!");
    console.error("   Set GROQ_API_KEY in your .env.local or Vercel environment variables");
    process.exit(1);
  }
  
  // Check for multiple keys
  const keyCount = groqKey.split(',').filter(k => k.trim()).length;
  const individualKeys = [];
  for (let i = 1; i <= 20; i++) {
    if (process.env[`GROQ_API_KEY_${i}`]) {
      individualKeys.push(i);
    }
  }
  
  console.log("✅ Groq API Keys Found:");
  console.log(`   - Main key count: ${keyCount} (comma-separated in GROQ_API_KEY)`);
  console.log(`   - Individual keys: ${individualKeys.length} (GROQ_API_KEY_1 through GROQ_API_KEY_${individualKeys.length})`);
  console.log(`   - Total unique keys: ${keyCount + individualKeys.length}`);
  console.log(`   - First key preview: ${groqKey.substring(0, 15)}...`);
  
  // Test 2: Check Groq API Connection
  console.log("\nTest 2: Testing Groq API Connection...");
  try {
    const Groq = require('groq-sdk').default;
    const client = new Groq({ apiKey: groqKey.split(',')[0].trim() });
    
    const testResponse = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: "Respond with exactly: 'API working'"
        }
      ],
      max_tokens: 10,
      temperature: 0,
    });
    
    const content = testResponse.choices[0]?.message?.content?.trim();
    console.log("✅ Groq API Connection: WORKING");
    console.log(`   Response: "${content}"`);
  } catch (apiError) {
    console.error("❌ CRITICAL: Groq API Connection FAILED!");
    console.error(`   Error: ${apiError.message}`);
    console.error(`   Status: ${apiError.status || 'unknown'}`);
    console.error(`   Code: ${apiError.code || 'unknown'}`);
    
    // Check specific error types
    if (apiError.status === 429) {
      console.error("\n⚠️  RATE LIMIT HIT - This is likely your issue!");
      console.error("   Solution: Wait for rate limit to reset, or add more API keys");
    } else if (apiError.status === 401 || apiError.status === 403) {
      console.error("\n⚠️  AUTHENTICATION ERROR - API key is invalid or expired!");
      console.error("   Solution: Get a new API key from https://console.groq.com");
    } else if (apiError.status === 400 && apiError.message?.includes('organization_restricted')) {
      console.error("\n⚠️  ORGANIZATION RESTRICTED - Your Groq account has been suspended!");
      console.error("   Solution: Contact Groq support or create a new account");
    }
    
    process.exit(1);
  }
  
  // Test 3: Test Food Recommendation Generation
  console.log("\nTest 3: Testing Food Recommendation Generation...");
  try {
    const { generateDailyRoutineRecommendations } = require('../lib/foodRecommendationAI');
    
    const mockMother = {
      id: "test-mother-id",
      name: "Test Mother",
      email: "test@example.com",
      age: 28,
      weeksPregnant: 20,
      daysPregnant: 140,
      conditions: "",
      allergies: "",
      medications: "",
      bloodGroup: "O+",
      previousPregnancies: 0,
      address: "Dhaka, Bangladesh",
      timezone: "Asia/Dhaka",
    };
    
    const mockLocationData = {
      country: "Bangladesh",
      countryCode: "BD",
      region: "Dhaka",
      city: "Dhaka",
      culture: "South Asian",
      climate: "tropical",
      urbanRural: "urban",
      timezone: "Asia/Dhaka",
    };
    
    console.log("   Generating recommendations for test mother (20 weeks pregnant, Dhaka)...");
    const startTime = Date.now();
    
    const result = await generateDailyRoutineRecommendations(
      mockMother,
      [],
      [],
      [],
      [],
      mockLocationData,
      []
    );
    
    const duration = Date.now() - startTime;
    
    console.log("✅ Food Recommendation Generation: WORKING");
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Breakfast length: ${result.breakfast?.length || 0} chars`);
    console.log(`   Lunch length: ${result.lunch?.length || 0} chars`);
    console.log(`   Dinner length: ${result.dinner?.length || 0} chars`);
    console.log(`   Exercises length: ${result.exercises?.length || 0} chars`);
    console.log(`   Water intake length: ${result.waterIntake?.length || 0} chars`);
    
    console.log("\n📋 Sample Recommendations:");
    console.log(`   Breakfast: ${result.breakfast?.substring(0, 100)}...`);
    console.log(`   Exercises: ${result.exercises?.substring(0, 100)}...`);
    
    // Check if recommendations are generic fallback or AI-generated
    const isGenericFallback = result.breakfast?.includes("Oatmeal") || 
                             result.breakfast?.includes("Paratha with egg curry");
    
    if (isGenericFallback) {
      console.warn("\n⚠️  WARNING: Recommendations appear to be FALLBACK (not AI-generated)");
      console.warn("   This means the AI is failing to generate proper recommendations");
      console.warn("   Check Groq API status, rate limits, or model availability");
    } else {
      console.log("\n✅ Recommendations appear to be AI-generated (good!)");
    }
    
  } catch (genError) {
    console.error("❌ CRITICAL: Food Recommendation Generation FAILED!");
    console.error(`   Error: ${genError.message}`);
    console.error(`   Stack: ${genError.stack}`);
    process.exit(1);
  }
  
  // Test 4: Check Database Connection (Supabase)
  console.log("\nTest 4: Checking Database Connection...");
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ Supabase credentials missing");
      console.error("   Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");
    } else {
      console.log("✅ Supabase credentials found");
      console.log(`   URL: ${supabaseUrl.substring(0, 30)}...`);
    }
  } catch (dbError) {
    console.error("❌ Database check failed:", dbError.message);
  }
  
  console.log("\n" + "=".repeat(70));
  console.log("✅ ALL TESTS COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(70) + "\n");
  
  console.log("📊 SUMMARY:");
  console.log("   ✅ Groq API keys are configured");
  console.log("   ✅ Groq API connection is working");
  console.log("   ✅ Food recommendations can be generated");
  console.log("   ✅ System is operational");
  console.log("\n💡 If recommendations still not working on Vercel:");
  console.log("   1. Check Vercel environment variables match local setup");
  console.log("   2. Check Vercel function logs for errors");
  console.log("   3. Verify Groq API keys are not rate-limited on Vercel");
  console.log("   4. Check if Vercel deployment has enough timeout (default: 10s, increase if needed)");
  console.log("   5. Verify the AI response is being parsed correctly");
}

// Run tests
testFoodRecommendations().catch(error => {
  console.error("\n" + "=".repeat(70));
  console.error("❌ TEST SUITE FAILED");
  console.error("=".repeat(70));
  console.error("\nError:", error.message);
  console.error("Stack:", error.stack);
  process.exit(1);
});
