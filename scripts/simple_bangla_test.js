const https = require('https');

// Test with a very simple Bangla query
function testSimpleBangla() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      messages: [{ role: "user", content: "হাই" }] // Simple "Hi" in Bangla
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
        console.log('Status:', res.statusCode);
        console.log('Response body:', responseBody);
        
        if (responseBody.length > 0) {
          try {
            const result = JSON.parse(responseBody);
            console.log('Parsed result:', result);
            resolve(result);
          } catch (error) {
            console.log('JSON parsing error:', error);
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

    req.write(data);
    req.end();
  });
}

// Run the test
testSimpleBangla().then(() => {
  console.log('Simple Bangla test completed');
}).catch((error) => {
  console.log('Simple Bangla test failed:', error);
});