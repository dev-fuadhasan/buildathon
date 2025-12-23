const { createClient } = require('@supabase/supabase-js');

// Supabase credentials
const supabaseUrl = 'https://hkbkmkuixrrvjehqppdq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYmtta3VpeHJydmplaHFwcGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMTA1OTQsImV4cCI6MjA4MTY4NjU5NH0.1KpkLIlcTCxA-7x8snKT4laUlcwc92rxDevI5roDy0Y';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function convertStringEmbeddingsToVectors() {
  try {
    console.log('Starting embedding conversion...');
    
    // Get a sample to check current format
    const { data: sample, error: sampleError } = await supabase
      .from('qa_embeddings')
      .select('qa_id, question, embedding')
      .limit(1);
    
    if (sampleError) {
      console.error('Error fetching sample:', sampleError);
      return;
    }
    
    if (sample && sample.length > 0) {
      console.log('Current embedding type:', typeof sample[0].embedding);
      console.log('Sample embedding (first 100 chars):', 
        typeof sample[0].embedding === 'string' ? sample[0].embedding.substring(0, 100) : 'Not a string');
      
      // Check if it's already a vector or still a string
      if (typeof sample[0].embedding === 'string') {
        console.log('Converting string embeddings to vectors...');
        
        // For demonstration, let's show how to convert one record
        // In practice, you'd want to do this in batches
        const embeddingArray = JSON.parse(sample[0].embedding);
        console.log(`Parsed embedding array length: ${embeddingArray.length}`);
        
        // To convert all embeddings, you would run SQL like this in Supabase:
        console.log('\nTo convert all embeddings, run this SQL in Supabase:');
        console.log(`
-- Convert string embeddings to vector format
UPDATE qa_embeddings 
SET embedding = embedding::vector(384)
WHERE qa_id = '${sample[0].qa_id}';

-- For all records (be careful with this):
-- UPDATE qa_embeddings 
-- SET embedding = embedding::vector(384);
        `);
      } else {
        console.log('Embeddings are already in vector format');
      }
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
}

convertStringEmbeddingsToVectors();