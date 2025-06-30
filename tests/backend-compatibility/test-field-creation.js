import { Field, initializeBindings } from '../../dist/node/index.js';

async function testFieldCreation() {
  await initializeBindings();
  
  console.log('Testing Field creation with 0xFFFFFFFFFFFFFFFF');
  
  // Test with hex number
  try {
    const f1 = Field(0xFFFFFFFFFFFFFFFF);
    console.log('Field from hex number:', f1.toBigInt());
    console.log('As hex:', f1.toBigInt().toString(16));
  } catch (e) {
    console.error('Error with hex number:', e.message);
  }
  
  // Test with bigint
  try {
    const f2 = Field(0xFFFFFFFFFFFFFFFFn);
    console.log('\nField from bigint:', f2.toBigInt());
    console.log('As hex:', f2.toBigInt().toString(16));
  } catch (e) {
    console.error('Error with bigint:', e.message);
  }
  
  // Test with number (might lose precision)
  console.log('\nJavaScript number precision:');
  console.log('0xFFFFFFFFFFFFFFFF as number:', 0xFFFFFFFFFFFFFFFF);
  console.log('Is it safe integer?', Number.isSafeInteger(0xFFFFFFFFFFFFFFFF));
  console.log('Number.MAX_SAFE_INTEGER:', Number.MAX_SAFE_INTEGER);
  console.log('As hex:', Number.MAX_SAFE_INTEGER.toString(16));
  
  // The actual value that JavaScript sees
  const jsNumber = 0xFFFFFFFFFFFFFFFF;
  console.log('\nActual JS number value:', jsNumber);
  console.log('As BigInt:', BigInt(jsNumber));
  console.log('As BigInt hex:', BigInt(jsNumber).toString(16));
}

testFieldCreation().catch(console.error);