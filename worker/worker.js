import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const GEMINI_KEY = process.env.GEMINI_KEY;

async function getBestImageFromOpenFoodFacts(barcode) {
  try {
    const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 1 && data.product) {
      // Try to get the highest quality image available
      const images = [
        data.product.image_url,
        data.product.image_front_url,
        data.product.image_ingredients_url,
        data.product.image_nutrition_url,
        data.product.image_front_small_url
      ].filter(img => img && img.includes('.jpg'));
      
      // Prefer larger images (not thumbnails)
      const bestImage = images.find(img => !img.includes('small')) || images[0];
      
      if (bestImage) {
        // Convert to higher quality version if possible
        const highQuality = bestImage.replace('.400.jpg', '.800.jpg').replace('small', 'large');
        console.log(`  📸 Found image: ${bestImage.substring(0, 80)}...`);
        return { url: bestImage, highQuality };
      }
    }
    return null;
  } catch (err) {
    console.log(`  ❌ API error: ${err.message}`);
    return null;
  }
}

async function imageToBase64(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  } catch {
    return null;
  }
}

async function validateImage(imageUrl, productName) {
  try {
    const base64 = await imageToBase64(imageUrl);
    if (!base64) {
      console.log(`  ❌ Could not download image`);
      return false;
    }
    
    // More lenient prompt for product recognition
    const prompt = `Look at this product image. Is this a "${productName}"? 
    Consider similar products, different packaging, or slightly different names as valid.
    Answer with only "YES" or "NO".`;
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: "image/jpeg", data: base64 } }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 1
          }
        })
      }
    );
    
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const isValid = text.toUpperCase().includes("YES");
    
    console.log(`  🧠 Gemini: ${isValid ? 'YES ✓' : 'NO ✗'} (${text})`);
    return isValid;
  } catch (error) {
    console.log(`  ❌ Validation error: ${error.message}`);
    return false;
  }
}

async function processProduct(product) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📦 ${product.product}`);
  console.log(`🔢 Barcode: ${product.barcode}`);
  console.log(`${'='.repeat(60)}`);
  
  // Try Open Food Facts
  console.log(`  🔍 Fetching from Open Food Facts...`);
  const imageData = await getBestImageFromOpenFoodFacts(product.barcode);
  
  if (!imageData) {
    console.log(`  ❌ No image found in Open Food Facts`);
    console.log(`  💡 Try scanning a different product`);
    return;
  }
  
  // Try high quality version first
  let imageToTest = imageData.url;
  let isValid = false;
  
  console.log(`  🖼️ Testing standard image...`);
  isValid = await validateImage(imageToTest, product.product);
  
  // If standard fails, try high quality
  if (!isValid && imageData.highQuality) {
    console.log(`  🖼️ Trying high quality version...`);
    isValid = await validateImage(imageData.highQuality, product.product);
    if (isValid) imageToTest = imageData.highQuality;
  }
  
  if (isValid) {
    await supabase.from("products").update({
      image_url: imageToTest,
      image_source: "openfoodfacts",
      image_validated_at: new Date().toISOString()
    }).eq("id", product.id);
    
    console.log(`\n  ✅✅✅ IMAGE SAVED SUCCESSFULLY! ✅✅✅`);
    console.log(`  📷 URL: ${imageToTest}`);
  } else {
    console.log(`\n  ❌❌❌ Image validation failed`);
    console.log(`  💡 You can manually add an image URL for this product`);
  }
}

async function run() {
  console.log("🟢 WORKER RUNNING - Using Open Food Facts API");
  console.log("📊 Waiting for products to scan...\n");
  
  let counter = 0;
  
  while (true) {
    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .is("image_url", null)
      .limit(2);
    
    if (error) {
      console.log("❌ Database error:", error);
    } else if (products && products.length > 0) {
      console.log(`\n🔍 Found ${products.length} product(s) needing images\n`);
      for (const p of products) {
        await processProduct(p);
      }
    } else {
      counter++;
      if (counter % 12 === 0) {
        console.log("💤 Waiting for products to be scanned...");
      }
      process.stdout.write(".");
    }
    
    await new Promise(r => setTimeout(r, 5000));
  }
}

run();
