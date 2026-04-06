const fs = require('fs');
const filePath = 'screens/ScannerScreen.js';
let content = fs.readFileSync(filePath, 'utf8');

// Add detailed API logging
const debugCode = `
      console.log('🔍 ===== API RESPONSE START =====');
      console.log('Full response:', JSON.stringify(json, null, 2));
      console.log('Store field:', json.store);
      console.log('Store from prices:', json.prices?.[0]?.store);
      console.log('🔍 ===== API RESPONSE END =====');
`;

// Insert after setResult
content = content.replace('setResult(json);', 'setResult(json);' + debugCode);

fs.writeFileSync(filePath, content);
console.log('✅ Added detailed API logging');
