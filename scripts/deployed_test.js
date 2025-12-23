const https = require('https');

// Test the deployed site with different languages
const testCases = [
  {
    name: "English → English",
    message: "What should I do if I miss a birth control pill?",
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
        'Content-Type': 'application/json',
        'Content-Length': data.length
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
          resolve({ testCase, result });
        } catch (error) {
          reject({ testCase, error: `JSON Parse Error: ${error.message}` });
        }
      });
    });

    req.on('error', (error) => {
      reject({ testCase, error: `Request Error: ${error.message}` });
    });

    req.write(data);
    req.end();
  });
}

// Run all tests
async function runTests() {
  console.log('Testing deployed site vector search functionality...\n');
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`${i + 1}. Testing: ${testCase.name}`);
    console.log(`   Query: ${testCase.message}`);
    
    try {
      const { result } = await testChatAPI(testCase);
      const reply = result.reply || '';
      
      console.log(`   ✅ Success - Reply (${reply.length} chars)`);
      
      // Show first 200 characters to identify language
      const preview = reply.substring(0, 200);
      console.log(`   Preview: ${preview}${reply.length > 200 ? '...' : ''}`);
      
      // Simple language detection
      const hasBangla = /[\u0980-\u09FF]/.test(reply.substring(0, 100));
      const detectedLang = hasBangla ? "Bangla" : "English";
      
      console.log(`   Detected language: ${detectedLang}`);
      console.log(`   Safety warning: ${result.safetyWarning || false}`);
      console.log(`   Risk level: ${result.riskLevel || 'unknown'}\n`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.error}\n`);
    }
  }
  
  console.log('Testing completed!');
}

// Run the tests
runTests();