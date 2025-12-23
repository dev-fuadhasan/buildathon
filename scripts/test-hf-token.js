const { HfInference } = require('@huggingface/inference');

// Test with the token from your previous message
const hfToken = 'e26a6a2ce5ba512e683ff825b7f165b7611e68184b6e27642bd0a307ac589675';
const hf = new HfInference(hfToken);

async function testHFAPI() {
  try {
    console.log('Testing Hugging Face API...');
    
    // Simple test with a small model
    const result = await hf.featureExtraction({
      model: 'intfloat/multilingual-e5-small',
      inputs: 'query: Hello world'
    });
    
    console.log('API test successful!');
    console.log('Result type:', typeof result);
    console.log('Result length:', Array.isArray(result) ? result.length : 'Not an array');
    
  } catch (err) {
    console.error('API test failed:', err.message);
    console.error('Error code:', err.statusCode);
  }
}

testHFAPI();