const fetch = require('node-fetch');

async function testFeatureExtractionV2() {
  try {
    console.log('Testing Hugging Face Feature Extraction API v2...');
    
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
          parameters: {
            return_full_text: false
          }
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
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testFeatureExtractionV2();