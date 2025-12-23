const { createClient } = require('@supabase/supabase-js');

// Use your Supabase credentials
const supabaseUrl = 'https://hkbkmkuixrrvjehqppdq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYmtta3VpeHJydmplaHFwcGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMTA1OTQsImV4cCI6MjA4MTY4NjU5NH0.1KpkLIlcTCxA-7x8snKT4laUlcwc92rxDevI5roDy0Y';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkEmbeddingDimension() {
  try {
    console.log('Checking embedding dimension in database...');
    
    // Try to get information about the embedding column
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, udt_name, character_maximum_length')
      .eq('table_name', 'qa_embeddings')
      .eq('column_name', 'embedding');
    
    if (error) {
      console.error('Error querying column info:', error);
      return;
    }
    
    console.log('Embedding column info:', data);
    
    if (data && data.length > 0) {
      console.log('Column details:');
      data.forEach(col => {
        console.log(`- Name: ${col.column_name}`);
        console.log(`- Data type: ${col.data_type}`);
        console.log(`- UDT name: ${col.udt_name}`);
        console.log(`- Max length: ${col.character_maximum_length}`);
      });
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

checkEmbeddingDimension();