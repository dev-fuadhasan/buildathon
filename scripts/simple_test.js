const https = require('https');

// Simple test for English query
function testEnglish() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      messages: [{ role: "user", content: "What causes morning sickness during pregnancy?" }]
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
          console.log('Status:', res.statusCode);
          console.log('Headers:', res.headers);
          console.log('Response body:', responseBody);
          const result = JSON.parse(responseBody);
          console.log('Parsed result:', result);
          resolve(result);
        } catch (error) {
          console.log('Error parsing response:', error);
          console.log('Raw response:', responseBody);
          reject(error);
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
testEnglish().then(() => {
  console.log('Test completed');
}).catch((error) => {
  console.log('Test failed:', error);
});