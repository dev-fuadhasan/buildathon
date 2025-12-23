const https = require('https');

// Test Banglish query with explicit UTF-8 encoding
function testBanglish() {
  return new Promise((resolve, reject) => {
    // Explicitly encode as UTF-8
    const data = JSON.stringify({
      messages: [{ role: "user", content: "Ami pregnant hole ki khabar khawa uchit?" }]
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
        console.log('Status:', res.statusCode);
        console.log('Response body length:', responseBody.length);
        console.log('First 300 chars:', responseBody.substring(0, 300));
        
        if (responseBody.length > 0) {
          try {
            const result = JSON.parse(responseBody);
            console.log('Reply length:', result.reply.length);
            console.log('First 300 chars of reply:', result.reply.substring(0, 300));
            console.log('Safety warning:', result.safetyWarning);
            console.log('Risk level:', result.riskLevel);
            
            // Check if reply contains Bangla characters
            const hasBangla = /[\u0980-\u09FF]/.test(result.reply);
            console.log('Contains Bangla characters:', hasBangla);
            
            resolve(result);
          } catch (error) {
            console.log('JSON parsing error:', error);
            console.log('Raw response:', responseBody);
            resolve(null);
          }
        } else {
          console.log('Empty response');
          resolve(null);
        }
      });
    });

    req.on('error', (error) => {
      console.log('Request error:', error);
      reject(error);
    });

    // Write with explicit UTF-8 encoding
    req.write(data, 'utf8');
    req.end();
  });
}

// Run the test
testBanglish().then(() => {
  console.log('Banglish test completed');
}).catch((error) => {
  console.log('Banglish test failed:', error);
});