const https = require('https');

// Test to check if vector search is actually being used
function testVectorSearch() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      messages: [{ role: "user", content: "What are the symptoms of preeclampsia during pregnancy?" }]
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
        
        if (responseBody.length > 0) {
          try {
            const result = JSON.parse(responseBody);
            console.log('Reply length:', result.reply.length);
            
            // Check if the response contains specific medical terminology that would come from the vector database
            const hasMedicalTerms = /preeclampsia|high blood pressure|protein in urine|swelling|headaches|vision changes/i.test(result.reply);
            console.log('Contains preeclampsia-related medical terms:', hasMedicalTerms);
            
            // Show a portion of the response
            console.log('Response preview:', result.reply.substring(0, 500) + '...');
            
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

    req.write(data, 'utf8');
    req.end();
  });
}

// Run the test
testVectorSearch().then(() => {
  console.log('Vector search test completed');
}).catch((error) => {
  console.log('Vector search test failed:', error);
});