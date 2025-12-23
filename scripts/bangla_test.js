const https = require('https');

// Test for Bangla query
function testBangla() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      messages: [{ role: "user", content: "গর্ভাবস্থায় কি ধরনের খাবার খাওয়া উচিত?" }]
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
          console.log('Response body length:', responseBody.length);
          console.log('First 200 chars:', responseBody.substring(0, 200));
          
          if (responseBody.length > 0) {
            const result = JSON.parse(responseBody);
            console.log('Parsed result:', result);
            resolve(result);
          } else {
            console.log('Empty response body');
            resolve(null);
          }
        } catch (error) {
          console.log('Error parsing response:', error);
          console.log('Raw response:', responseBody);
          console.log('Response length:', responseBody.length);
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
testBangla().then(() => {
  console.log('Bangla test completed');
}).catch((error) => {
  console.log('Bangla test failed:', error);
});