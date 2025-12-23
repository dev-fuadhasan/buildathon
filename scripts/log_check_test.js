// This script is meant to be run while monitoring the application logs
// to verify that semantic search is being used instead of keyword search

const https = require('https');

function makeTestRequest(message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      messages: [{ role: "user", content: message }]
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
          console.log(`✅ Request completed for: "${message}"`);
          console.log(`   Reply length: ${result.reply.length} chars`);
          console.log(`   First 100 chars: "${result.reply.substring(0, 100)}..."`);
          resolve(result);
        } catch (error) {
          console.log(`❌ Error for "${message}":`, error.message);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Request error for "${message}":`, error.message);
      reject(error);
    });

    req.write(data, 'utf8');
    req.end();
  });
}

async function runLogCheck() {
  console.log('📝 LOG CHECK TEST - Monitor application logs for:');
  console.log('   - "[🔍 SEMANTIC SEARCH] Starting search"');
  console.log('   - "[🔑 KEYWORD SEARCH] Starting keyword search"');
  console.log('   - Look for "✅ Found X search results" messages\n');
  
  console.log('⏳ Running test requests...\n');
  
  const testMessages = [
    "What causes morning sickness during pregnancy?",
    "গর্ভাবস্থায় কি ধরনের খাবার খাওয়া উচিত?",
    "Ami pregnant hole ki khabar khawa uchit?"
  ];
  
  for (let i = 0; i < testMessages.length; i++) {
    const message = testMessages[i];
    console.log(`${i + 1}. Testing: "${message}"`);
    try {
      await makeTestRequest(message);
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
    console.log('');
  }
  
  console.log('✅ Test completed!');
  console.log('\n📋 NEXT STEPS:');
  console.log('   1. Check application logs for semantic search indicators');
  console.log('   2. Look for messages containing "SEMANTIC SEARCH" rather than "KEYWORD SEARCH"');
  console.log('   3. Verify that vector database is being queried');
}

// Run the test
runLogCheck();