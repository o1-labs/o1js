import { switchBackend } from './dist/node/bindings.js';

async function debugBridge() {
  await switchBackend('sparky');
  console.log('Bridge exists:', !!globalThis.sparkyConstraintBridge);
  console.log('Bridge keys:', Object.keys(globalThis.sparkyConstraintBridge || {}));
  console.log('emitIfConstraint exists:', typeof globalThis.sparkyConstraintBridge?.emitIfConstraint);
  console.log('emitIfConstraint value:', globalThis.sparkyConstraintBridge?.emitIfConstraint);
}

debugBridge().catch(console.error);