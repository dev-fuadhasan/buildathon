const { createClient } = require('@supabase/supabase-js');

// Test Supabase connection
async function testSupabase() {
  try {
    console.log("Testing Supabase connection...");
    
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log("Supabase URL present:", !!supabaseUrl);
    console.log("Supabase Anon Key present:", !!supabaseAnonKey);
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.log("Missing Supabase environment variables");
      return;
    }
    
    // Create client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test a simple query
    console.log("Testing simple query...");
    const { data, error } = await supabase
      .from('qa_embeddings')
      .select('qa_id, question, answer')
      .limit(1);
      
    if (error) {
      console.error("Supabase query error:", error);
    } else {
      console.log("Query successful!");
      console.log("Data:", data);
    }
  } catch (error) {
    console.error("Error testing Supabase:", error);
  }
}

testSupabase();