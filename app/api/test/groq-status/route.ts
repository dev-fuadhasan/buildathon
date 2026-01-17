/**
 * Diagnostic endpoint to check Groq API status
 * 
 * Access: /api/test/groq-status
 * 
 * Returns:
 * - Groq API key status
 * - API connection test
 * - Model availability
 * - Rate limit info
 */

import { NextRequest, NextResponse } from "next/server";
import { groq, isGroqConfigured } from "@/lib/groqClient";

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: [],
    overall: "unknown",
  };

  // Test 1: Check if Groq is configured
  results.tests.push({
    name: "Groq API Configuration",
    status: isGroqConfigured() ? "✅ PASS" : "❌ FAIL",
    details: isGroqConfigured() 
      ? "Groq API keys found in environment variables"
      : "No GROQ_API_KEY found! Set in Vercel environment variables.",
  });

  if (!isGroqConfigured()) {
    results.overall = "❌ CRITICAL: No API keys configured";
    return NextResponse.json(results, { status: 500 });
  }

  // Test 2: Test API connection
  try {
    console.log("[Groq Status] Testing API connection...");
    const testResponse = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: "Respond with exactly: 'OK'"
        }
      ],
      max_tokens: 10,
      temperature: 0,
    });

    const content = testResponse.choices[0]?.message?.content?.trim();
    const success = content?.toLowerCase().includes("ok");

    results.tests.push({
      name: "Groq API Connection Test",
      status: success ? "✅ PASS" : "⚠️  PARTIAL",
      details: `API responded with: "${content}"`,
      model: "llama-3.3-70b-versatile",
    });
  } catch (apiError: any) {
    console.error("[Groq Status] API test failed:", apiError.message);
    
    let errorDetails = {
      message: apiError.message || "Unknown error",
      status: apiError.status || "unknown",
      code: apiError.code || "unknown",
    };

    let diagnosis = "Unknown error";
    if (apiError.status === 429 || apiError.message?.includes('rate limit')) {
      diagnosis = "⚠️  RATE LIMIT HIT - Too many requests. Wait or add more API keys.";
    } else if (apiError.status === 401 || apiError.status === 403) {
      diagnosis = "⚠️  AUTHENTICATION ERROR - API key is invalid or expired.";
    } else if (apiError.status === 400 && apiError.message?.includes('organization_restricted')) {
      diagnosis = "⚠️  ORGANIZATION RESTRICTED - Account suspended. Contact Groq support.";
    } else if (apiError.message?.includes('timeout')) {
      diagnosis = "⚠️  TIMEOUT - Request took too long.";
    }

    results.tests.push({
      name: "Groq API Connection Test",
      status: "❌ FAIL",
      details: errorDetails,
      diagnosis,
    });

    results.overall = "❌ FAIL: " + diagnosis;
    return NextResponse.json(results, { status: 500 });
  }

  // Test 3: Test vision model (for prescription analysis)
  try {
    console.log("[Groq Status] Testing vision model...");
    const visionResponse = await groq.chat.completions.create({
      model: "meta-llama/llama-4-maverick-17b-128e-instruct",
      messages: [
        {
          role: "user",
          content: "Respond with: 'Vision OK'"
        }
      ],
      max_tokens: 10,
      temperature: 0,
    });

    const content = visionResponse.choices[0]?.message?.content?.trim();
    const success = content?.toLowerCase().includes("vision") || content?.toLowerCase().includes("ok");

    results.tests.push({
      name: "Vision Model Test",
      status: success ? "✅ PASS" : "⚠️  PARTIAL",
      details: `Vision model responded with: "${content}"`,
      model: "meta-llama/llama-4-maverick-17b-128e-instruct",
    });
  } catch (visionError: any) {
    console.error("[Groq Status] Vision model test failed:", visionError.message);
    
    results.tests.push({
      name: "Vision Model Test",
      status: "⚠️  FAIL",
      details: `Vision model not available: ${visionError.message}`,
      note: "This may affect prescription analysis, but food recommendations should still work",
    });
  }

  // Test 4: Test JSON generation (critical for food recommendations)
  try {
    console.log("[Groq Status] Testing JSON generation...");
    const jsonResponse = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: 'Respond with ONLY valid JSON: {"status": "working", "test": true}'
        }
      ],
      max_tokens: 50,
      temperature: 0,
    });

    const content = jsonResponse.choices[0]?.message?.content?.trim() || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        results.tests.push({
          name: "JSON Generation Test",
          status: "✅ PASS",
          details: "AI can generate valid JSON",
          sample: parsed,
        });
      } catch (parseError) {
        results.tests.push({
          name: "JSON Generation Test",
          status: "⚠️  FAIL",
          details: "AI returned JSON-like text but parsing failed",
          sample: content,
        });
      }
    } else {
      results.tests.push({
        name: "JSON Generation Test",
        status: "⚠️  FAIL",
        details: "AI did not return JSON format",
        sample: content,
      });
    }
  } catch (jsonError: any) {
    console.error("[Groq Status] JSON test failed:", jsonError.message);
    
    results.tests.push({
      name: "JSON Generation Test",
      status: "❌ FAIL",
      details: `JSON generation test failed: ${jsonError.message}`,
    });
  }

  // Overall status
  const failCount = results.tests.filter((t: any) => t.status.includes("❌")).length;
  const warnCount = results.tests.filter((t: any) => t.status.includes("⚠️")).length;

  if (failCount > 0) {
    results.overall = `❌ FAIL: ${failCount} test(s) failed`;
  } else if (warnCount > 0) {
    results.overall = `⚠️  WARNING: ${warnCount} test(s) have warnings`;
  } else {
    results.overall = "✅ ALL SYSTEMS OPERATIONAL";
  }

  // Add recommendations
  results.recommendations = [];

  if (failCount > 0 || warnCount > 0) {
    results.recommendations.push("Check FOOD_RECOMMENDATION_FIX.md for detailed troubleshooting steps");
    
    const hasRateLimit = results.tests.some((t: any) => 
      t.details?.toString().includes('rate limit') || 
      t.diagnosis?.includes('RATE LIMIT')
    );
    
    if (hasRateLimit) {
      results.recommendations.push("Add more GROQ_API_KEY_1, GROQ_API_KEY_2, etc. to Vercel environment variables");
      results.recommendations.push("Wait 24 hours for rate limit to reset (free tier)");
      results.recommendations.push("Or upgrade to paid Groq plan for higher limits");
    }
    
    const hasAuthError = results.tests.some((t: any) => 
      t.details?.toString().includes('401') || 
      t.details?.toString().includes('403') ||
      t.diagnosis?.includes('AUTHENTICATION')
    );
    
    if (hasAuthError) {
      results.recommendations.push("Regenerate API key at https://console.groq.com/keys");
      results.recommendations.push("Update GROQ_API_KEY in Vercel environment variables");
    }
    
    const hasOrgRestricted = results.tests.some((t: any) => 
      t.details?.toString().includes('organization_restricted') ||
      t.diagnosis?.includes('ORGANIZATION RESTRICTED')
    );
    
    if (hasOrgRestricted) {
      results.recommendations.push("Contact Groq support at support@groq.com");
      results.recommendations.push("Or create a new Groq account and get fresh API keys");
    }
  } else {
    results.recommendations.push("All systems operational!");
    results.recommendations.push("If food recommendations still not working, check function logs");
  }

  return NextResponse.json(results, { status: failCount > 0 ? 500 : 200 });
}
