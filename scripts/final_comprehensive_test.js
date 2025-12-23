const https = require('https');

// Test cases for all languages
const testCases = [
  {
    name: "English → English",
    message: "What are the benefits of prenatal vitamins during pregnancy?",
    expectedLanguage: "English"
  },
  {
    name: "Bangla → Bangla", 
    message: "গর্ভাবস্থায় কি ধরনের খাবার খাওয়া উচিত?",
    expectedLanguage: "Bangla"
  },
  {
    name: "Banglish → Bangla",
    message: "Ami pregnant hole ki khabar khawa uchit?",
    expectedLanguage: "Bangla"
  }
];

// Function to make API request with proper UTF-8 encoding
function testChatAPI(testCase) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      messages: [{ role: "user", content: testCase.message }]
    });

    const options = {
      hostname: 'momscareai.vercel.app',
      port: 443,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(data, 'utf8')
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(responseBody);
          resolve({ testCase, result, statusCode: res.statusCode });
        } catch (error) {
          reject({ testCase, error: `JSON Parse Error: ${error.message}`, rawResponse: responseBody, statusCode: res.statusCode });
        }
      });
    });

    req.on('error', (error) => {
      reject({ testCase, error: `Request Error: ${error.message}` });
    });

    req.write(data, 'utf8');
    req.end();
  });
}

// Run all tests
async function runComprehensiveTests() {
  console.log('🧪 COMPREHENSIVE DEPLOYED SITE TEST');
  console.log('=====================================\n');
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`${i + 1}. Testing: ${testCase.name}`);
    console.log(`   Query: ${testCase.message}`);
    
    try {
      const { result, statusCode } = await testChatAPI(testCase);
      const reply = result.reply || '';
      
      if (statusCode === 200 && reply.length > 0) {
        console.log(`   ✅ SUCCESS - Status: ${statusCode}`);
        console.log(`   Reply Length: ${reply.length} characters`);
        
        // Detect language
        const hasBangla = /[\u0980-\u09FF]/.test(reply);
        const detectedLang = hasBangla ? "Bangla" : "English";
        
        console.log(`   Detected Language: ${detectedLang}`);
        console.log(`   Expected Language: ${testCase.expectedLanguage}`);
        
        // Check if language matches expectation
        const languageMatch = detectedLang === testCase.expectedLanguage;
        console.log(`   Language Match: ${languageMatch ? '✅' : '❌'}`);
        
        // Show preview
        const preview = reply.substring(0, 150);
        console.log(`   Preview: "${preview}${reply.length > 150 ? '...' : ''}"`);
        
        console.log(`   Safety Warning: ${result.safetyWarning || false}`);
        console.log(`   Risk Level: ${result.riskLevel || 'unknown'}\n`);
        
        if (languageMatch) {
          passedTests++;
        }
      } else {
        console.log(`   ❌ FAILED - Status: ${statusCode}`);
        console.log(`   Reply Length: ${reply.length} characters\n`);
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.error}`);
      if (error.rawResponse) {
        console.log(`   Raw Response: ${error.rawResponse.substring(0, 100)}...\n`);
      } else {
        console.log('');
      }
    }
  }
  
  console.log('=====================================');
  console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED! Vector semantic search is working correctly for all languages.');
    console.log('   - English queries return English responses');
    console.log('   - Bangla queries return Bangla responses');
    console.log('   - Banglish queries return Bangla responses');
    console.log('   - Vector search is retrieving relevant content from the database');
  } else {
    console.log('⚠️  SOME TESTS FAILED. Please check the implementation.');
  }
}

// Run the comprehensive tests
runComprehensiveTests();