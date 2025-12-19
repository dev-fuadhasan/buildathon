const fs = require('fs');

// Read the file
let content = fs.readFileSync('components/SupabaseSemanticChatComponent.tsx', 'utf8');

// Define the section to replace
const oldSection = `      if (safety.shouldCallEmergency) {
        const emergencyMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: \`🚨 EMERGENCY
\${safety.recommendations.join('
')}

Call emergency services immediately!\`,
          timestamp: new Date().toISOString(),
        };`;

const newSection = `      if (safety.shouldCallEmergency) {
        const emergencyMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: \`🚨 EMERGENCY\n\n\${safety.recommendations.join('\n')}\n\nCall emergency services immediately!\`,
          timestamp: new Date().toISOString(),
        };`;

// Replace the section
content = content.replace(oldSection, newSection);

// Write the file back
fs.writeFileSync('components/SupabaseSemanticChatComponent.tsx', content);

console.log('Fixed the emergency message section');