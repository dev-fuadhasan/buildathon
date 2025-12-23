const { createClient } = require('@supabase/supabase-js');

// Use your Supabase credentials
const supabaseUrl = 'https://hkbkmkuixrrvjehqppdq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYmtta3VpeHJydmplaHFwcGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMTA1OTQsImV4cCI6MjA4MTY4NjU5NH0.1KpkLIlcTCxA-7x8snKT4laUlcwc92rxDevI5roDy0Y';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkFunctions() {
  try {
    console.log('Checking available functions in Supabase...');
    
    // Query the pg_proc table to see what functions exist
    const { data, error } = await supabase
      .from('pg_proc')
      .select('proname, pronargs, proargnames, proargtypes')
      .ilike('proname', '%semantic%')
      .order('proname');
    
    if (error) {
      console.error('Error querying functions:', error);
      return;
    }
    
    console.log('Found semantic-related functions:');
    data.forEach(func => {
      console.log(`- ${func.proname} (${func.pronargs} args)`);
    });
    
    // Also check for the specific function we're trying to use
    const { data: searchData, error: searchError } = await supabase
      .from('pg_proc')
      .select('proname')
      .eq('proname', 'semantic_search_384');
    
    if (searchError) {
      console.error('Error checking for semantic_search_384:', searchError);
    } else {
      console.log(`Function 'semantic_search_384' exists: ${searchData.length > 0 ? 'YES' : 'NO'}`);
      if (searchData.length > 0) {
        console.log('Function found!');
      }
    }
    
    // Check for semantic_search function
    const { data: searchData2, error: searchError2 } = await supabase
      .from('pg_proc')
      .select('proname')
      .eq('proname', 'semantic_search');
    
    if (searchError2) {
      console.error('Error checking for semantic_search:', searchError2);
    } else {
      console.log(`Function 'semantic_search' exists: ${searchData2.length > 0 ? 'YES' : 'NO'}`);
      if (searchData2.length > 0) {
        console.log('Alternative function found!');
      }
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
}

checkFunctions();