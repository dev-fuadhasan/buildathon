const fs = require('fs');

// Read the file
let content = fs.readFileSync('components/SupabaseSemanticChatComponent.tsx', 'utf8');

// Fix the broken template literal by finding the specific pattern
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('content: `🚨 EMERGENCY')) {
    // Replace the broken multiline template literal with a single line one
    lines[i] = "          content: `🚨 EMERGENCY\\n\\n${safety.recommendations.join('\\n')}\\n\\nCall emergency services immediately!`,";
    // Skip the next lines that were part of the broken template literal
    i += 5; // Skip the next 5 lines
  }
}

content = lines.join('\n');

// Write the file back
fs.writeFileSync('components/SupabaseSemanticChatComponent.tsx', content);