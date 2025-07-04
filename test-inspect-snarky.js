const { switchBackend } = await import('./dist/node/index.js');
const { Snarky } = await import('./dist/node/bindings.js');

async function inspectSnarky() {
  await switchBackend('sparky');
  
  console.log('Snarky object keys:', Object.keys(Snarky));
  console.log('\nSnarky.field:', Snarky.field);
  console.log('Type of Snarky.field:', typeof Snarky.field);
  
  if (Snarky.field) {
    console.log('\nSnarky.field methods:');
    for (const [key, value] of Object.entries(Snarky.field)) {
      console.log(`  ${key}: ${typeof value}`);
    }
  }
}

inspectSnarky().catch(console.error);