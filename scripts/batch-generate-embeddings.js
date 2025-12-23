const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');

// Supabase credentials
const supabaseUrl = 'https://hkbkmkuixrrvjehqppdq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYmtta3VpeHJydmplaHFwcGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMTA1OTQsImV4cCI6MjA4MTY4NjU5NH0.1KpkLIlcTCxA-7x8snKT4laUlcwc92rxDevI5roDy0Y';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const hf = new HfInference(process.env.HF_TOKEN);

async function generateEmbeddingsForAllQuestions() {
  try {
    console.log('Starting batch embedding generation...');
    
    // Get all questions that don't have embeddings yet
    const { data: questions, error } = await supabase
      .from('qa_embeddings')
      .select('qa_id, question')
      .limit(100); // Process in batches
    
    if (error) {
      console.error('Error fetching questions:', error);
      return;
    }
    
    console.log(`Processing ${questions.length} questions...`);
    
    // Process each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      console.log(`Processing ${i+1}/${questions.length}: ${q.question.substring(0, 50)}...`);
      
      try {
        // Generate embedding
        const result = await hf.featureExtraction({
          model: 'intfloat/multilingual-e5-small',
          inputs: `query: ${q.question}`
        });
        
        // Flatten the result if needed
        let embedding = Array.isArray(result[0]) ? result[0] : result;
        if (Array.isArray(embedding) && embedding.length > 0 && Array.isArray(embedding[0])) {
          embedding = embedding.flat();
        }
        
        // Update the database with the embedding
        const { error: updateError } = await supabase
          .from('qa_embeddings')
          .update({ embedding: embedding })
          .eq('qa_id', q.qa_id);
        
        if (updateError) {
          console.error(`Error updating embedding for ${q.qa_id}:`, updateError);
        } else {
          console.log(`✅ Updated embedding for ${q.qa_id}`);
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.error(`Error processing question ${q.qa_id}:`, err.message);
      }
    }
    
    console.log('Batch embedding generation completed!');
    
  } catch (err) {
    console.error('Fatal error:', err);
  }
}

// Run the function
generateEmbeddingsForAllQuestions();