const { HfInference } = require('@huggingface/inference');

async function testHfInferenceLibrary() {
  try {
    console.log('Testing Hugging Face Inference Library...');
    
    const hf = new HfInference(process.env.HF_API_KEY);
    
    // Try feature extraction
    const result = await hf.featureExtraction({
      model: 'intfloat/multilingual-e5-small',
      inputs: 'query: What foods are rich in folic acid?'
    });
    
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

testHfInferenceLibrary();