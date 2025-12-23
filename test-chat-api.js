const https = require('https');

const data = JSON.stringify({
  messages: [{ role: 'user', content: 'What foods are rich in folic acid?' }]
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
  console.log(`Status: ${res.statusCode}`);
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', responseData);
    
    try {
      const json = JSON.parse(responseData);
      if (json.reply) {
        console.log('Success! Reply:', json.reply.substring(0, 200) + '...');
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