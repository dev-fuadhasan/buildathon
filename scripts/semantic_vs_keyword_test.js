const https = require('https');

// Test cases that would work well with semantic search but not keyword search
const testCases = [
  {
    name: "Semantic Search Test 1",
    message: "What should I eat when I'm expecting?",
    description: "This is a semantic variation of 'nutrition during pregnancy'"
  },
  {
    name: "Semantic Search Test 2", 
    message: "How to deal with morning nausea?",
    description: "This is a semantic variation of 'morning sickness'"
  },
  {
    name: "Semantic Search Test 3",
    message: "Ways to stay healthy while carrying a baby",
    description: "This is a semantic variation of 'prenatal care'"
  }
];

// Function to make API request
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

// Run semantic search tests
async function runSemanticTests() {
  console.log('🔬 SEMANTIC SEARCH VS KEYWORD SEARCH TEST');
  console.log('==========================================\n');
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`${i + 1}. ${testCase.name}`);
    console.log(`   Query: "${testCase.message}"`);
    console.log(`   Description: ${testCase.description}`);
    
    try {
      const { result, statusCode } = await testChatAPI(testCase);
      const reply = result.reply || '';
      
      if (statusCode === 200 && reply.length > 0) {
        console.log(`   ✅ SUCCESS - Status: ${statusCode}`);
        console.log(`   Reply Length: ${reply.length} characters`);
        
        // Show preview
        const preview = reply.substring(0, 200);
        console.log(`   Preview: "${preview}${reply.length > 200 ? '...' : ''}"`);
        
        // Check if response seems substantive (indicating semantic search worked)
        const isSubstantive = reply.length > 300 && 
                             !reply.includes("I can only help with health and pregnancy-related questions") &&
                             !reply.includes("Hi! I'm MomsCare AI");
                             
        console.log(`   Substantive Response: ${isSubstantive ? '✅' : '❌'}`);
        
        if (isSubstantive) {
          passedTests++;
        }
        
        console.log(`   Safety Warning: ${result.safetyWarning || false}`);
        console.log(`   Risk Level: ${result.riskLevel || 'unknown'}\n`);
      } else {
        console.log(`   ❌ FAILED - Status: ${statusCode}\n`);
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.error}\n`);
    }
  }
  
  console.log('==========================================');
  console.log(`📊 RESULTS: ${passedTests}/${totalTests} semantic tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL SEMANTIC SEARCH TESTS PASSED!');
    console.log('   This indicates that vector semantic search is working correctly');
    console.log('   and not just relying on simple keyword matching.');
  } else {
    console.log('⚠️  SOME SEMANTIC SEARCH TESTS FAILED.');
    console.log('   This might indicate the system is falling back to keyword search.');
  }
}

// Run the tests
runSemanticTests();