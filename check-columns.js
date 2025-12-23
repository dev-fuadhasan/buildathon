const { createClient } = require('@supabase/supabase-js');

// Use your Supabase credentials
const supabaseUrl = 'https://hkbkmkuixrrvjehqppdq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYmtta3VpeHJydmplaHFwcGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMTA1OTQsImV4cCI6MjA4MTY4NjU5NH0.1KpkLIlcTCxA-7x8snKT4laUlcwc92rxDevI5roDy0Y';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
  try {
    console.log('Checking table columns...');
    
    // Try to get all columns from the table
    const { data, error } = await supabase
      .from('qa_embeddings')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error getting table data:', error);
    } else {
      console.log('Table data retrieved successfully');
      if (data && data.length > 0) {
        const row = data[0];
        console.log('Available columns:');
        Object.keys(row).forEach(key => {
          console.log(`- ${key}: ${typeof row[key]}`);
        });
        
        // Check embedding specifically
        if (row.hasOwnProperty('embedding')) {
          console.log('\nEmbedding details:');
          console.log('Type:', typeof row.embedding);
          if (Array.isArray(row.embedding)) {
            console.log('Length:', row.embedding.length);
            console.log('First 3 values:', row.embedding.slice(0, 3));
          }
        }
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

checkColumns();