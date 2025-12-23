const https = require('https');

const data = JSON.stringify({
  text: 'What foods are rich in folic acid?'
});

const options = {
  hostname: 'momscareai.vercel.app',
  port: 443,
  path: '/api/embedding-384',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', responseData);
    
    try {
      const json = JSON.parse(responseData);
      if (json.embedding && Array.isArray(json.embedding)) {
        console.log(`Success! Embedding dimensions: ${json.embedding.length}`);
        console.log(`First 5 values: ${json.embedding.slice(0, 5).join(', ')}`);
      }
    } catch (e) {
      console.error('Error parsing response:', e.message);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();