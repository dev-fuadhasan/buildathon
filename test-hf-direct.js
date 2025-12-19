const { InferenceClient } = require("@huggingface/inference");

// Use your token directly for testing
const HF_TOKEN = "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";

async function testHuggingFaceEmbedding() {
  try {
    console.log("Testing Hugging Face embedding service...");
    
    const client = new InferenceClient(HF_TOKEN);
    
    const text = "What should I do if I have a headache during pregnancy?";
    console.log(`Generating embedding for: "${text}"`);
    
    const result = await client.featureExtraction({
      model: "sentence-transformers/all-MiniLM-L6-v2",
      inputs: `query: ${text}`,
    });
    
    console.log("Embedding generated successfully!");
    console.log("Type of result:", typeof result);
    console.log("Constructor name:", result.constructor.name);
    
    let embedding;
    if (Array.isArray(result)) {
      embedding = result;
    } else if (result.constructor.name === 'Float32Array') {
      embedding = Array.from(result);
    }
    
    console.log("Embedding length:", embedding.length);
    console.log("First 5 values:", embedding.slice(0, 5));
    
    return embedding;
  } catch (error) {
    console.error("Error testing Hugging Face embedding:", error.message);
    console.error("Stack trace:", error.stack);
    throw error;
  }
}

// Run the test
testHuggingFaceEmbedding()
  .then(embedding => {
    console.log("✅ Test completed successfully!");
    console.log(`Generated embedding with ${embedding.length} dimensions`);
  })
  .catch(error => {
    console.error("❌ Test failed:", error.message);
  });