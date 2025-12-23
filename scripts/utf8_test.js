const https = require('https');

// Test with explicit UTF-8 encoding
function testUTF8() {
  return new Promise((resolve, reject) => {
    // Explicitly encode as UTF-8
    const data = JSON.stringify({
      messages: [{ role: "user", content: "Hello" }]
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

    // Write with explicit UTF-8 encoding
    req.write(data, 'utf8');
    req.end();
  });
}

// Run the test
testUTF8().then(() => {
  console.log('UTF-8 test completed');
}).catch((error) => {
  console.log('UTF-8 test failed:', error);
});