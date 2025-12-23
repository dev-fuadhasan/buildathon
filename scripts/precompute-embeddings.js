const { createClient } = require('@supabase/supabase-js');
const { HfInference } = require('@huggingface/inference');
const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');

// Supabase credentials
const supabaseUrl = 'https://hkbkmkuixrrvjehqppdq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYmtta3VpeHJydmplaHFwcGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMTA1OTQsImV4cCI6MjA4MTY4NjU5NH0.1KpkLIlcTCxA-7x8snKT4laUlcwc92rxDevI5roDy0Y';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Hugging Face setup
const hfToken = process.env.HF_TOKEN;
if (!hfToken) {
  console.error('HF_TOKEN environment variable is required');
  process.exit(1);
}
const hf = new HfInference(hfToken);

// Function to read CSV file
async function readCSV(filePath) {
  const results = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Function to generate embedding for a question
async function generateEmbedding(question) {
  try {
    const result = await hf.featureExtraction({
      model: 'intfloat/multilingual-e5-small',
      inputs: `query: ${question}`
    });
    
    // Flatten the result if needed
    let embedding = Array.isArray(result[0]) ? result[0] : result;
    if (Array.isArray(embedding) && embedding.length > 0 && Array.isArray(embedding[0])) {
      embedding = embedding.flat();
    }
    
    return embedding;
  } catch (err) {
    console.error(`Error generating embedding for: ${question}`, err.message);
    return null;
  }
}

// Function to process and store embeddings
async function processDataset() {
  try {
    console.log('Starting dataset processing...');
    
    // Read the main dataset
    const csvData = await readCSV(path.join(__dirname, '..', 'moms_care_dataset.csv'));
    console.log(`Loaded ${csvData.length} Q&A pairs from CSV`);
    
    // Process in batches to avoid overwhelming the APIs
    const batchSize = 5;
    for (let i = 0; i < csvData.length; i += batchSize) {
      const batch = csvData.slice(i, i + batchSize);
      console.log(`\nProcessing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(csvData.length/batchSize)}`);
      
      // Process each item in the batch
      for (const [index, item] of batch.entries()) {
        const globalIndex = i + index;
        console.log(`  Processing ${globalIndex + 1}/${csvData.length}: ${item.question.substring(0, 50)}...`);
        
        try {
          // Generate embedding
          const embedding = await generateEmbedding(item.question);
          if (!embedding) {
            console.error(`  ❌ Failed to generate embedding for item ${globalIndex + 1}`);
            continue;
          }
          
          console.log(`  ✅ Generated embedding with ${embedding.length} dimensions`);
          
          // Check if this Q&A already exists in the database
          const { data: existing, error: fetchError } = await supabase
            .from('qa_embeddings')
            .select('qa_id')
            .eq('question', item.question)
            .single();
          
          if (fetchError && fetchError.code !== 'PGRST116') {
            console.error(`  Error checking existing record:`, fetchError);
            continue;
          }
          
          if (existing) {
            // Update existing record
            const { error: updateError } = await supabase
              .from('qa_embeddings')
              .update({ 
                embedding: embedding,
                answer: item.answer,
                category: item.tag || 'general',
                language: 'en'
              })
              .eq('qa_id', existing.qa_id);
            
            if (updateError) {
              console.error(`  ❌ Error updating record:`, updateError);
            } else {
              console.log(`  ✅ Updated existing record ${existing.qa_id}`);
            }
          } else {
            // Insert new record
            const { error: insertError } = await supabase
              .from('qa_embeddings')
              .insert({
                qa_id: `csv_${Date.now()}_${globalIndex}`,
                question: item.question,
                answer: item.answer,
                content: `${item.question}\n${item.answer}`,
                embedding: embedding,
                language: 'en',
                category: item.tag || 'general',
                source: 'dataset'
              });
            
            if (insertError) {
              console.error(`  ❌ Error inserting record:`, insertError);
            } else {
              console.log(`  ✅ Inserted new record`);
            }
          }
          
        } catch (err) {
          console.error(`  Error processing item ${globalIndex + 1}:`, err.message);
        }
      }
      
      // Add delay between batches to avoid rate limiting
      if (i + batchSize < csvData.length) {
        console.log(`  Waiting 2 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('\n🎉 Dataset processing completed!');
    
  } catch (err) {
    console.error('Fatal error:', err);
  }
}

// Run the function
processDataset();