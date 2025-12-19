const fs = require('fs');

// Read the file
let content = fs.readFileSync('components/SupabaseSemanticChatComponent.tsx', 'utf8');

// Split into lines
const lines = content.split('\n');

// Find and fix the broken template literal
let newLines = [];
let i = 0;
while (i < lines.length) {
  if (lines[i].includes('content: `🚨 EMERGENCY') && lines[i].includes('\\n\\n${safety.recommendations.join')) {
    // This line is already fixed, skip it and the next broken lines
    newLines.push(lines[i]);
    // Skip the broken lines
    while (i + 1 < lines.length && (lines[i + 1].includes('${safety.recommendations.join') || 
                                   lines[i + 1].includes('Call emergency services immediately'))) {
      i++;
    }
    i++;
    continue;
  }
  
  if (lines[i].includes('content: `🚨 EMERGENCY')) {
    // This is a broken line, replace it with the fixed version
    newLines.push('          content: `🚨 EMERGENCY\\n\\n${safety.recommendations.join(\'\\n\')}\\n\\nCall emergency services immediately!`,');
    // Skip the broken lines
    while (i + 1 < lines.length && (lines[i + 1].includes('${safety.recommendations.join') || 
                                   lines[i + 1].includes('Call emergency services immediately') ||
                                   lines[i + 1].includes(')`') ||
                                   lines[i + 1].trim() === '')) {
      i++;
    }
    i++;
    continue;
  }
  
  newLines.push(lines[i]);
  i++;
}

content = newLines.join('\n');

// Write the file back
fs.writeFileSync('components/SupabaseSemanticChatComponent.tsx', content);