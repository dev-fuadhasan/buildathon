const { createClient } = require('@supabase/supabase-js');

// Use your Supabase credentials
const supabaseUrl = 'https://hkbkmkuixrrvjehqppdq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYmtta3VpeHJydmplaHFwcGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMTA1OTQsImV4cCI6MjA4MTY4NjU5NH0.1KpkLIlcTCxA-7x8snKT4laUlcwc92rxDevI5roDy0Y';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testVectorConversion() {
  try {
    console.log('Testing vector conversion...');
    
    // Get a sample embedding as text
    const { data, error } = await supabase
      .from('qa_embeddings')
      .select('embedding')
      .limit(1);
    
    if (error) {
      console.error('Error querying table:', error);
      return;
    }
    
    if (data && data.length > 0 && data[0].embedding) {
      console.log('Original embedding (string):', data[0].embedding.substring(0, 100) + '...');
      
      // Try to parse it as JSON
      try {
        const embeddingArray = JSON.parse(data[0].embedding);
        console.log(`Parsed embedding array length: ${embeddingArray.length}`);
        console.log(`First 5 values: ${embeddingArray.slice(0, 5).join(', ')}`);
        
        // Try to convert to vector format (this might not work directly)
        console.log('Attempting to use in vector search...');
        
      } catch (parseErr) {
        console.error('Error parsing embedding as JSON:', parseErr);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

testVectorConversion();