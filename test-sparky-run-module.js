const { switchToSparky } = require('./dist/node/bindings/js/global-backend-controller.js');

async function testSparkyRunModule() {
  try {
    console.log('Switching to Sparky backend...');
    await switchToSparky();
    
    // Get the sparky adapter
    const sparkyAdapter = require('./dist/node/bindings/sparky-adapter.js');
    
    // Try to access run module
    console.log('Accessing Snarky.run...');
    const run = sparkyAdapter.Snarky.run;
    console.log('run object:', run);
    console.log('run object keys:', Object.keys(run));
    console.log('run object methods:', Object.getOwnPropertyNames(run));
    
    // Try to call inProver
    console.log('\nTrying to call inProver...');
    try {
      const result = run.inProver();
      console.log('inProver result:', result);
    } catch (e) {
      console.error('Error calling inProver:', e.message);
      console.error('Stack:', e.stack);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSparkyRunModule();