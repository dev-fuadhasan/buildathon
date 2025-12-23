const { createClient } = require('@supabase/supabase-js');

// Use your Supabase credentials
const supabaseUrl = 'https://hkbkmkuixrrvjehqppdq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYmtta3VpeHJydmplaHFwcGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMTA1OTQsImV4cCI6MjA4MTY4NjU5NH0.1KpkLIlcTCxA-7x8snKT4laUlcwc92rxDevI5roDy0Y';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testVectorSearch() {
  try {
    console.log('Testing vector search function...');
    
    // Test the semantic_search_384 function with a dummy embedding
    const dummyEmbedding = Array(384).fill(0.1);
    
    const { data, error } = await supabase
      .rpc('semantic_search_384', {
        query_embedding: dummyEmbedding,
        similarity_threshold: 0.1,
        limit_results: 3
      });
    
    if (error) {
      console.error('Error calling semantic_search_384:', error);
      
      // Try the semantic_search function as fallback
      console.log('Trying semantic_search function...');
      const { data: data2, error: error2 } = await supabase
        .rpc('semantic_search', {
          filter_language: null,
          filter_severity: null,
          query_embedding: dummyEmbedding,
          result_limit: 3,
          similarity_threshold: 0.1
        });
      
      if (error2) {
        console.error('Error calling semantic_search:', error2);
      } else {
        console.log('semantic_search function call successful!');
        console.log('Results count:', data2 ? data2.length : 0);
        if (data2 && data2.length > 0) {
          console.log('First result:', JSON.stringify(data2[0], null, 2));
        }
      }
    } else {
      console.log('semantic_search_384 function call successful!');
      console.log('Results count:', data ? data.length : 0);
      if (data && data.length > 0) {
        console.log('First result:', JSON.stringify(data[0], null, 2));
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

testVectorSearch();