/**
 * Debug test suite specifically for @method decorator processing
 * 
 * This test isolates the @method decorator issue between Snarky and Sparky backends.
 */

export interface TestCase {
  name: string;
  testFn: () => Promise<any>;
  timeout?: number;
}

export const tests: TestCase[] = [
  {
    name: 'basic-method-decorator-registration',
    testFn: async () => {
      const o1js = (global as any).o1js;
      const { SmartContract, State, state, Field, method, Mina } = o1js;
      
      // Create test contract with @method decorator
      class TestContract extends SmartContract {
        @state(Field) value = State();
        
        init() {
          super.init();
          this.value.set(Field(0));
        }
        
        @method async increment() {
          const current = this.value.getAndRequireEquals();
          const newValue = current.add(Field(1));
          this.value.set(newValue);
        }
      }
      
      // Check if methods are registered
      const methodsRegistry = (TestContract as any)._methods;
      const proversRegistry = (TestContract as any)._provers;
      
      console.log('🔍 Method registration check:');
      console.log('  _methods:', methodsRegistry);
      console.log('  _provers:', proversRegistry);
      
      return {
        hasMethodsRegistry: !!methodsRegistry,
        hasProversRegistry: !!proversRegistry,
        methodCount: methodsRegistry ? Object.keys(methodsRegistry).length : 0,
        methods: methodsRegistry ? Object.keys(methodsRegistry) : [],
        registrationWorking: !!methodsRegistry && Object.keys(methodsRegistry).includes('increment')
      };
    },
    timeout: 5000
  },
  
  {
    name: 'method-decorator-compilation-attempt',
    testFn: async () => {
      const o1js = (global as any).o1js;
      const { SmartContract, State, state, Field, method, Mina } = o1js;
      
      // Set up LocalBlockchain
      let blockchainSetup = true;
      try {
        const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
        Mina.setActiveInstance(Local);
      } catch (error) {
        blockchainSetup = false;
      }
      
      // Create test contract
      class TestContract extends SmartContract {
        @state(Field) value = State();
        
        init() {
          super.init();
          this.value.set(Field(0));
        }
        
        @method async increment() {
          const current = this.value.getAndRequireEquals();
          const newValue = current.add(Field(1));
          this.value.set(newValue);
        }
      }
      
      // Attempt compilation
      let compilationSuccess = false;
      let compilationError = '';
      let compilationResult = null;
      
      try {
        const startTime = Date.now();
        compilationResult = await TestContract.compile();
        const endTime = Date.now();
        
        compilationSuccess = true;
        console.log(`✅ Compilation successful in ${endTime - startTime}ms`);
        
      } catch (error: any) {
        compilationError = error.message;
        console.log(`❌ Compilation failed: ${error.message}`);
        console.log(`📍 Stack: ${error.stack?.split('\n').slice(0, 5).join('\n')}`);
      }
      
      return {
        blockchainSetup,
        compilationSuccess,
        compilationError,
        verificationKeyExists: compilationResult?.verificationKey ? true : false,
        verificationKeyHash: compilationResult?.verificationKey?.hash || 'missing',
        proverCount: compilationResult?.provers ? Object.keys(compilationResult.provers).length : 0,
        proverMethods: compilationResult?.provers ? Object.keys(compilationResult.provers) : []
      };
    },
    timeout: 120000
  },
  
  {
    name: 'method-decorator-metadata-inspection',
    testFn: async () => {
      const o1js = (global as any).o1js;
      const { SmartContract, State, state, Field, method } = o1js;
      
      // Create test contract
      class TestContract extends SmartContract {
        @state(Field) value = State();
        
        @method async increment() {
          const current = this.value.getAndRequireEquals();
          const newValue = current.add(Field(1));
          this.value.set(newValue);
        }
      }
      
      // Inspect prototype and method metadata
      const prototypeProps = Object.getOwnPropertyNames(TestContract.prototype);
      const methodNames = prototypeProps.filter(name => name !== 'constructor' && name !== 'init');
      
      // Check for decorator metadata if available
      let decoratorMetadata: Record<string, string> = {};
      if (typeof Reflect !== 'undefined' && Reflect.getMetadata) {
        for (const methodName of methodNames) {
          try {
            const metadata = Reflect.getMetadata('design:type', TestContract.prototype, methodName);
            decoratorMetadata[methodName] = metadata ? 'exists' : 'missing';
          } catch (e) {
            decoratorMetadata[methodName] = 'error';
          }
        }
      }
      
      return {
        prototypeProps,
        methodNames,
        decoratorMetadata,
        reflectAvailable: typeof Reflect !== 'undefined' && !!Reflect.getMetadata,
        contractMethodsProperty: !!(TestContract as any)._methods,
        contractProversProperty: !!(TestContract as any)._provers
      };
    },
    timeout: 5000
  }
];

export default { tests };