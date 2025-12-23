const { createClient } = require('@supabase/supabase-js');

// Use your Supabase credentials
const supabaseUrl = 'https://hkbkmkuixrrvjehqppdq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYmtta3VpeHJydmplaHFwcGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMTA1OTQsImV4cCI6MjA4MTY4NjU5NH0.1KpkLIlcTCxA-7x8snKT4laUlcwc92rxDevI5roDy0Y';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  try {
    console.log('Checking updated schema...');
    
    // Try to get information about the embedding column type
    const { data, error } = await supabase.rpc('keyword_search', {
      query_text: 'test',
      limit_results: 1
    });
    
    if (error) {
      console.log('Keyword search error (expected):', error.message);
    }
    
    // Try to get a sample row to see the embedding structure
    const { data: sampleData, error: sampleError } = await supabase
      .from('qa_embeddings')
      .select('id, question, embedding')
      .limit(1);
    
    if (sampleError) {
      console.error('Error getting sample data:', sampleError);
    } else {
      console.log('Sample data retrieved successfully');
      if (sampleData && sampleData.length > 0) {
        console.log('Sample row ID:', sampleData[0].id);
        console.log('Sample question:', sampleData[0].question);
        console.log('Embedding type:', typeof sampleData[0].embedding);
        if (Array.isArray(sampleData[0].embedding)) {
          console.log('Embedding is array with length:', sampleData[0].embedding.length);
        } else {
          console.log('Embedding is not an array, type:', typeof sampleData[0].embedding);
        }
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

checkSchema();