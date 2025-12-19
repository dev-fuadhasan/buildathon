const fs = require('fs');

// Read the file
let content = fs.readFileSync('components/SupabaseSemanticChatComponent.tsx', 'utf8');

// Split into lines
const lines = content.split('\n');

// Fix the specific lines (81-86)
// Line 81 should be the correct content line
lines[80] = '          content: `🚨 EMERGENCY\\\\n\\\\n${safety.recommendations.join(\'\\\\n\')}\\\\n\\\\nCall emergency services immediately!`,';

// Remove the corrupted lines 82-86
lines.splice(81, 5);

// Join back and write
content = lines.join('\n');
fs.writeFileSync('components/SupabaseSemanticChatComponent.tsx', content);

console.log('Fixed the template literal issue');