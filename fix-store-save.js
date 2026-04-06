const fs = require('fs');
const filePath = 'screens/ScannerScreen.js';
let content = fs.readFileSync(filePath, 'utf8');

// Find the saveProductToSupabase call and add store from prices
const savePattern = /await saveProductToSupabase\(\{([^}]+)\}\)/s;
const replacement = `await saveProductToSupabase({
        barcode: data,
        name: json.name || json.product_name || 'Unknown Product',
        store: json.prices?.[0]?.store || json.store || 'Open Food Facts',
        brand: json.brand,
        quantity: json.quantity,
        image_url: json.image_url || null
      })`;

content = content.replace(savePattern, replacement);
fs.writeFileSync(filePath, content);
console.log('✅ Fixed store extraction from prices array');
