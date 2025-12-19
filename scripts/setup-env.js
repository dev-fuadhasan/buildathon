/**
 * ENVIRONMENT SETUP SCRIPT
 * ========================
 * 
 * This script helps set up the environment variables needed for the application.
 * It creates a .env.local file with the required variables.
 */

const fs = require('fs');
const path = require('path');

// Check if .env.local already exists
const envPath = path.join(__dirname, '..', '.env.local');

if (fs.existsSync(envPath)) {
  console.log('✅ .env.local file already exists');
  console.log('Checking contents...\n');
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log(envContent);
  
  // Check if HF_TOKEN is present
  if (envContent.includes('HF_TOKEN=')) {
    console.log('✅ HF_TOKEN is already configured');
  } else {
    console.log('⚠️  HF_TOKEN is missing');
    console.log('\nTo add it, edit the .env.local file and add:');
    console.log('HF_TOKEN=your_hugging_face_token_here');
  }
  
  process.exit(0);
}

// Create a template .env.local file
const template = `# Environment variables for MomsCare AI
# Rename this file to .env.local and fill in your values

# Hugging Face API token (required for embeddings)
# Get yours at: https://huggingface.co/settings/tokens
HF_TOKEN=your_hugging_face_token_here

# Supabase configuration (required for database)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Groq API key (required for AI responses)
GROQ_API_KEY=your_groq_api_key

# Optional: Custom embedding service
# EMBEDDING_SERVICE_URL=your_custom_embedding_service_url
# EMBEDDING_SERVICE_KEY=your_custom_embedding_service_key
`;

try {
  fs.writeFileSync(envPath, template);
  console.log('✅ Created .env.local file');
  console.log('\nNext steps:');
  console.log('1. Edit .env.local and fill in your actual values');
  console.log('2. Get your HF_TOKEN from https://huggingface.co/settings/tokens');
  console.log('3. Get your Supabase credentials from your Supabase project dashboard');
  console.log('4. Get your Groq API key from https://console.groq.com');
  console.log('\nExample of what to fill in:');
  console.log('HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  console.log('NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here');
  console.log('GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
} catch (error) {
  console.error('❌ Failed to create .env.local file:', error.message);
  process.exit(1);
}