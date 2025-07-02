import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

console.log('\n=== Debug Variable Format ===\n');

// Switch to Sparky
await switchBackend('sparky');
console.log('Backend:', getCurrentBackend());

const sparky = globalThis.__snarky;
const Snarky = sparky.Snarky;

console.log('1. Enter constraint system:');
const handle = Snarky.run.enterConstraintSystem();

console.log('\n2. Create variables using exists:');
const x = Snarky.run.exists(0, () => "3");
const y = Snarky.run.exists(0, () => "4");
console.log('   x:', x);
console.log('   x type:', typeof x);
console.log('   x is array:', Array.isArray(x));
console.log('   x length:', x?.length);
console.log('   x[0]:', x?.[0]);

console.log('\n3. Create Field and check its value:');
const fieldX = Field(3);
console.log('   fieldX:', fieldX);
console.log('   fieldX.value:', fieldX.value);
console.log('   fieldX.value type:', typeof fieldX.value);
console.log('   fieldX.value is array:', Array.isArray(fieldX.value));

console.log('\n4. Test different variable creation methods:');
// Try existsOne
const z = Snarky.run.existsOne(() => "12");
console.log('   existsOne result:', z);
console.log('   existsOne type:', typeof z);

// Try using Field.from
const w = Field.from(5);
console.log('   Field.from(5).value:', w.value);

console.log('\n5. Exit constraint system:');
const cs = handle();

console.log('\n=== Complete ===\n');