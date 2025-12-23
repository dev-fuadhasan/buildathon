const { createClient } = require('@supabase/supabase-js');

// Use your Supabase credentials
const supabaseUrl = 'https://hkbkmkuixrrvjehqppdq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYmtta3VpeHJydmplaHFwcGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMTA1OTQsImV4cCI6MjA4MTY4NjU5NH0.1KpkLIlcTCxA-7x8snKT4laUlcwc92rxDevI5roDy0Y';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTableStructure() {
  try {
    console.log('Checking table structure...');
    
    // Try to get a sample row to see the embedding structure
    const { data, error } = await supabase
      .from('qa_embeddings')
      .select('embedding')
      .limit(1);
    
    if (error) {
      console.error('Error querying table:', error);
      return;
    }
    
    console.log('Sample data:', JSON.stringify(data, null, 2));
    
    if (data && data.length > 0 && data[0].embedding) {
      console.log(`Embedding dimension: ${data[0].embedding.length}`);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

checkTableStructure();