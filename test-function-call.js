const { createClient } = require('@supabase/supabase-js');

// Use your Supabase credentials
const supabaseUrl = 'https://hkbkmkuixrrvjehqppdq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYmtta3VpeHJydmplaHFwcGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMTA1OTQsImV4cCI6MjA4MTY4NjU5NH0.1KpkLIlcTCxA-7x8snKT4laUlcwc92rxDevI5roDy0Y';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFunctionCall() {
  try {
    console.log('Testing semantic_search_384 function call...');
    
    // Try to call the semantic_search_384 function with dummy parameters
    const { data, error } = await supabase
      .rpc('semantic_search_384', {
        query_embedding: Array(384).fill(0), // Dummy 384-dimensional embedding
        similarity_threshold: 0.25,
        limit_results: 5
      });
    
    if (error) {
      console.error('Error calling semantic_search_384:', error);
      
      // Try the alternative function name
      console.log('Trying semantic_search function...');
      const { data: data2, error: error2 } = await supabase
        .rpc('semantic_search', {
          query_embedding: Array(384).fill(0), // Dummy 384-dimensional embedding
          similarity_threshold: 0.25,
          limit_results: 5
        });
      
      if (error2) {
        console.error('Error calling semantic_search:', error2);
      } else {
        console.log('semantic_search function call successful!');
        console.log('Data:', data2);
      }
    } else {
      console.log('semantic_search_384 function call successful!');
      console.log('Data:', data);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

testFunctionCall();