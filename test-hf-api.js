const fetch = require('node-fetch');

async function testHFAPI() {
  try {
    console.log('Testing Hugging Face API...');
    
    const response = await fetch(
      'https://router.huggingface.co/hf-inference/models/intfloat/multilingual-e5-small',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: 'query: What foods are rich in folic acid?',
          options: { wait_for_model: true }
        }),
      }
    );

    console.log(`Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const result = await response.json();
    console.log('Success! Result:', JSON.stringify(result, null, 2));
    
    // Check if we got the expected embedding
    if (Array.isArray(result) && result.length > 0) {
      const embedding = Array.isArray(result[0]) ? result[0] : result;
      console.log(`Embedding dimensions: ${embedding.length}`);
      console.log(`First 5 values: ${embedding.slice(0, 5).join(', ')}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testHFAPI();