"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const backend_generic_js_1 = require("../lib/provable/backend-generic.js");
const index_js_1 = require("../index.js");
async function testForeignFieldAdd() {
    console.log('Testing ForeignFieldAdd implementation...\n');
    // Switch to sparky backend
    await (0, backend_generic_js_1.switchBackend)('sparky');
    console.log('Current backend:', (0, backend_generic_js_1.getCurrentBackend)());
    // Create a foreign field with a specific modulus (e.g., secp256k1 field)
    const secp256k1Modulus = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;
    const ForeignFieldSecp = (0, index_js_1.createForeignField)(secp256k1Modulus);
    console.log('\n🧪 Test 1: Simple addition');
    try {
        await index_js_1.Provable.runAndCheck(() => {
            const a = index_js_1.Provable.witness(ForeignFieldSecp, () => ForeignFieldSecp.from(10n));
            const b = index_js_1.Provable.witness(ForeignFieldSecp, () => ForeignFieldSecp.from(20n));
            const result = a.add(b);
            console.log('a =', a.toBigInt());
            console.log('b =', b.toBigInt());
            console.log('a + b =', result.toBigInt());
            console.log('Expected:', 30n);
            // Assert the result
            result.assertEquals(ForeignFieldSecp.from(30n));
        });
        console.log('✅ Test 1 passed!\n');
    }
    catch (error) {
        console.error('❌ Test 1 failed:', error);
    }
    console.log('🧪 Test 2: Addition with modular reduction');
    try {
        await index_js_1.Provable.runAndCheck(() => {
            const a = index_js_1.Provable.witness(ForeignFieldSecp, () => ForeignFieldSecp.from(secp256k1Modulus - 5n));
            const b = index_js_1.Provable.witness(ForeignFieldSecp, () => ForeignFieldSecp.from(10n));
            const result = a.add(b);
            console.log('a =', a.toBigInt());
            console.log('b =', b.toBigInt());
            console.log('a + b (mod p) =', result.toBigInt());
            console.log('Expected:', 5n);
            // The result should be 5 due to modular reduction
            result.assertEquals(ForeignFieldSecp.from(5n));
        });
        console.log('✅ Test 2 passed!\n');
    }
    catch (error) {
        console.error('❌ Test 2 failed:', error);
    }
    console.log('🧪 Test 3: Subtraction (using negative sign)');
    try {
        await index_js_1.Provable.runAndCheck(() => {
            const a = index_js_1.Provable.witness(ForeignFieldSecp, () => ForeignFieldSecp.from(30n));
            const b = index_js_1.Provable.witness(ForeignFieldSecp, () => ForeignFieldSecp.from(10n));
            const result = a.sub(b);
            console.log('a =', a.toBigInt());
            console.log('b =', b.toBigInt());
            console.log('a - b =', result.toBigInt());
            console.log('Expected:', 20n);
            // Assert the result
            result.assertEquals(ForeignFieldSecp.from(20n));
        });
        console.log('✅ Test 3 passed!\n');
    }
    catch (error) {
        console.error('❌ Test 3 failed:', error);
    }
    console.log('Testing complete!');
}
// Run the test
testForeignFieldAdd().catch(console.error);
