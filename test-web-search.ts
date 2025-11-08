/**
 * Test script for advanced web search detection
 */

import { detectWebNeedAdvanced } from './src/lib/web-search-advanced';

const testQueries = [
  // Indonesian
  "Siapa presiden Indonesia sekarang?",
  "Berapa harga iPhone 15 terbaru?",
  "Cuaca hari ini di Jakarta gimana?",
  
  // English
  "What is the latest version of Next.js?",
  "Who won the match today?",
  "Price of Bitcoin now?",
  
  // Spanish
  "¿Cuál es el precio del iPhone?",
  "¿Cuándo es el próximo concierto?",
  
  // French
  "Quel est le prix de l'or aujourd'hui?",
  
  // German
  "Wie ist das Wetter heute?",
  
  // Non-web queries
  "Explain React hooks",
  "How to sort an array in JavaScript",
];

async function runTests() {
  console.log('🧪 Testing Advanced Web Search Detection\n');
  
  for (const query of testQueries) {
    console.log(`📝 Query: "${query}"`);
    try {
      const result = await detectWebNeedAdvanced(query);
      console.log(`   ✓ Detected Language: ${result.detectedLanguage}`);
      console.log(`   ✓ Needs Web: ${result.needsWeb}`);
      console.log(`   ✓ Confidence: ${result.confidence}`);
      if (result.reason) {
        console.log(`   ✓ Reason: ${result.reason}`);
      }
      if (result.categories.length > 0) {
        console.log(`   ✓ Categories: ${result.categories.join(', ')}`);
      }
      console.log('');
    } catch (error) {
      console.error(`   ✗ Error:`, error);
      console.log('');
    }
  }
}

runTests();
