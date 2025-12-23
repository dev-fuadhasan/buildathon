const { createClient } = require('@supabase/supabase-js');

// Supabase credentials
const supabaseUrl = 'https://hkbkmkuixrrvjehqppdq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYmtta3VpeHJydmplaHFwcGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMTA1OTQsImV4cCI6MjA4MTY4NjU5NH0.1KpkLIlcTCxA-7x8snKT4laUlcwc92rxDevI5roDy0Y';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testExistingEmbeddings() {
  try {
    console.log('Testing existing embeddings...');
    
    // Get a sample record with its embedding
    const { data: sample, error: sampleError } = await supabase
      .from('qa_embeddings')
      .select('qa_id, question, embedding')
      .limit(1);
    
    if (sampleError) {
      console.error('Error fetching sample:', sampleError);
      return;
    }
    
    if (sample && sample.length > 0) {
      console.log('Sample question:', sample[0].question);
      console.log('Embedding type:', typeof sample[0].embedding);
      
      // Check if it's a string (JSON) or array
      if (typeof sample[0].embedding === 'string') {
        console.log('Embedding is stored as string, parsing...');
        try {
          const embeddingArray = JSON.parse(sample[0].embedding);
          console.log(`Parsed embedding array length: ${embeddingArray.length}`);
          
          // Test vector search with this parsed embedding
          console.log('Testing vector search with parsed embedding...');
          const { data, error } = await supabase
            .rpc('semantic_search_384', {
              query_embedding: embeddingArray,
              similarity_threshold: 0.1,
              limit_results: 3
            });
          
          if (error) {
            console.error('Vector search error:', error);
          } else {
            console.log(`Vector search returned ${data.length} results`);
            if (data.length > 0) {
              console.log('First result:', data[0].question);
            }
          }
        } catch (parseErr) {
          console.error('Error parsing embedding:', parseErr);
        }
      } else if (Array.isArray(sample[0].embedding)) {
        console.log(`Embedding is already an array with ${sample[0].embedding.length} elements`);
      }
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
}

testExistingEmbeddings();