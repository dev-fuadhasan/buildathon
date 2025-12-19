/**
 * TEST SCRIPT FOR HUGGING FACE EMBEDDING SERVICE
 * =============================================
 * 
 * This script tests the Hugging Face embedding service to ensure it works correctly.
 * 
 * To run this script:
 * 1. Set your HF_TOKEN environment variable
 * 2. Run: node test-hf-embedding.js
 */

// Import the embedding function
import { generateEmbedding } from './lib/huggingfaceEmbedding.js';

async function testEmbedding() {
  try {
    console.log('Testing Hugging Face embedding service...');
    
    // Test with a sample query
    const testQuery = "What are the symptoms of morning sickness during pregnancy?";
    
    console.log(`Generating embedding for: "${testQuery}"`);
    
    const embedding = await generateEmbedding(testQuery);
    
    console.log(`Success! Generated embedding with ${embedding.length} dimensions`);
    console.log(`First 5 values: [${embedding.slice(0, 5).join(', ')}]`);
    
    // Test with another query
    const testQuery2 = "How often should I visit my doctor during pregnancy?";
    
    console.log(`\nGenerating embedding for: "${testQuery2}"`);
    
    const embedding2 = await generateEmbedding(testQuery2);
    
    console.log(`Success! Generated embedding with ${embedding2.length} dimensions`);
    console.log(`First 5 values: [${embedding2.slice(0, 5).join(', ')}]`);
    
    // Calculate similarity between the two embeddings
    function cosineSimilarity(vecA, vecB) {
      if (vecA.length !== vecB.length) return 0;
      
      let dotProduct = 0;
      let magnitudeA = 0;
      let magnitudeB = 0;
      
      for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        magnitudeA += vecA[i] * vecA[i];
        magnitudeB += vecB[i] * vecB[i];
      }
      
      magnitudeA = Math.sqrt(magnitudeA);
      magnitudeB = Math.sqrt(magnitudeB);
      
      if (magnitudeA === 0 || magnitudeB === 0) return 0;
      
      return dotProduct / (magnitudeA * magnitudeB);
    }
    
    const similarity = cosineSimilarity(embedding, embedding2);
    console.log(`\nCosine similarity between the two queries: ${similarity.toFixed(4)}`);
    
    console.log('\n✅ Hugging Face embedding service is working correctly!');
    
  } catch (error) {
    console.error('❌ Error testing Hugging Face embedding service:', error);
    console.error('Make sure you have set the HF_TOKEN environment variable');
  }
}

// Run the test
testEmbedding();