/**
 * Enhanced Error Types for Better Test Diagnostics
 * 
 * Created: July 5, 2025, 03:15 UTC
 * Last Modified: July 5, 2025, 03:15 UTC
 */

export interface TestExecutionContext {
  suiteName: string;
  testName: string;
  backend: string;
  phase: 'initialization' | 'compilation' | 'execution' | 'comparison' | 'cleanup';
  inputs?: any[];
  expectedResult?: any;
  actualResult?: any;
  timestamp: number;
}

export interface DetailedError {
  type: 'COMPILATION_ERROR' | 'EXECUTION_ERROR' | 'COMPARISON_ERROR' | 'BACKEND_ERROR' | 'INFRASTRUCTURE_ERROR';
  message: string;
  stack?: string;
  context: TestExecutionContext;
  originalError?: any;
  suggestions?: string[];
  relatedErrors?: DetailedError[];
}

export interface ComparisonDetails {
  snarkyResult: any;
  sparkyResult: any;
  differences: {
    field: string;
    snarkyValue: any;
    sparkyValue: any;
    description: string;
  }[];
  inputValues: any[];
  constraintCountDifference?: {
    snarky: number;
    sparky: number;
    delta: number;
  };
}

export interface EnhancedTestResult {
  testName: string;
  success: boolean;
  duration: number;
  backends: string[];
  results: { [backend: string]: any };
  comparison?: {
    match: boolean;
    details?: ComparisonDetails;
    summary: string;
  };
  error?: DetailedError;
  warnings?: string[];
  memoryUsage?: {
    peak: number;
    current: number;
    backend: string;
  };
}

export class TestError extends Error {
  public readonly type: DetailedError['type'];
  public readonly context: TestExecutionContext;
  public readonly originalError?: any;
  public readonly suggestions: string[];

  constructor(
    type: DetailedError['type'],
    message: string,
    context: TestExecutionContext,
    originalError?: any,
    suggestions: string[] = []
  ) {
    super(message);
    this.name = 'TestError';
    this.type = type;
    this.context = context;
    this.originalError = originalError;
    this.suggestions = suggestions;
  }

  toDetailedError(): DetailedError {
    return {
      type: this.type,
      message: this.message,
      stack: this.stack,
      context: this.context,
      originalError: this.originalError,
      suggestions: this.suggestions
    };
  }

  static fromGenericError(error: any, context: TestExecutionContext): TestError {
    const message = error?.message || String(error);
    const stack = error?.stack;
    
    // Try to categorize the error
    let type: DetailedError['type'] = 'INFRASTRUCTURE_ERROR';
    let suggestions: string[] = [];

    if (message.includes('not a provable type')) {
      type = 'COMPILATION_ERROR';
      suggestions = [
        'Check that parameter types are correctly imported with static imports',
        'Verify that @method decorators have proper TypeScript metadata',
        'See IMPLEMENTATION_PATTERN.md for the correct .impl.ts pattern'
      ];
    } else if (message.includes('Backend switch failed')) {
      type = 'BACKEND_ERROR';
      suggestions = [
        'Check that both snarky and sparky backends are properly initialized',
        'Verify that the backend switching mechanism is working'
      ];
    } else if (message.includes('Invalid FieldVar format')) {
      type = 'EXECUTION_ERROR';
      suggestions = [
        'Avoid wrapping already-typed Field values: use newValue directly instead of Field(newValue)',
        'Check that Field operations are using consistent types'
      ];
    } else if (message.includes('compilation failed') || message.includes('compile')) {
      type = 'COMPILATION_ERROR';
      suggestions = [
        'Check that all imports are available',
        'Verify that the circuit is valid',
        'Check for constraint generation issues'
      ];
    }

    const testError = new TestError(type, message, context, error, suggestions);
    testError.stack = stack || testError.stack;
    return testError;
  }
}

export class ErrorFormatter {
  static formatDetailedError(error: DetailedError): string {
    const { type, message, context, suggestions } = error;
    
    let output = '';
    output += `\n❌ ${type.replace('_', ' ')}\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    output += `Test: ${context.suiteName} → ${context.testName}\n`;
    output += `Backend: ${context.backend}\n`;
    output += `Phase: ${context.phase}\n`;
    output += `Time: ${new Date(context.timestamp).toISOString()}\n\n`;
    
    output += `🔍 Error Details:\n`;
    output += `   ${message}\n\n`;
    
    if (context.inputs && context.inputs.length > 0) {
      output += `📥 Input Values:\n`;
      context.inputs.forEach((input, i) => {
        output += `   [${i}] ${String(input).substring(0, 100)}\n`;
      });
      output += `\n`;
    }
    
    if (context.expectedResult) {
      output += `🎯 Expected: ${String(context.expectedResult).substring(0, 200)}\n`;
    }
    
    if (context.actualResult) {
      output += `🎭 Actual: ${String(context.actualResult).substring(0, 200)}\n\n`;
    }
    
    if (suggestions && suggestions.length > 0) {
      output += `💡 Suggestions:\n`;
      suggestions.forEach(suggestion => {
        output += `   • ${suggestion}\n`;
      });
      output += `\n`;
    }
    
    if (error.stack) {
      output += `📚 Stack Trace:\n`;
      output += error.stack.split('\n').slice(0, 10).map(line => `   ${line}`).join('\n');
      output += `\n`;
    }
    
    return output;
  }

  static formatComparisonError(comparison: ComparisonDetails): string {
    let output = '';
    output += `\n🔍 BACKEND COMPARISON MISMATCH\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    output += `📥 Input Values:\n`;
    comparison.inputValues.forEach((input, i) => {
      output += `   [${i}] ${String(input).substring(0, 100)}\n`;
    });
    output += `\n`;
    
    output += `📊 Results:\n`;
    output += `   Snarky: ${String(comparison.snarkyResult).substring(0, 200)}\n`;
    output += `   Sparky: ${String(comparison.sparkyResult).substring(0, 200)}\n\n`;
    
    if (comparison.differences.length > 0) {
      output += `🎯 Specific Differences:\n`;
      comparison.differences.forEach(diff => {
        output += `   ${diff.field}: ${diff.description}\n`;
        output += `     Snarky: ${String(diff.snarkyValue).substring(0, 100)}\n`;
        output += `     Sparky: ${String(diff.sparkyValue).substring(0, 100)}\n`;
      });
      output += `\n`;
    }
    
    if (comparison.constraintCountDifference) {
      const { snarky, sparky, delta } = comparison.constraintCountDifference;
      output += `🔧 Constraint Count Difference:\n`;
      output += `   Snarky: ${snarky} constraints\n`;
      output += `   Sparky: ${sparky} constraints\n`;
      output += `   Delta: ${delta > 0 ? '+' : ''}${delta}\n\n`;
    }
    
    return output;
  }

  static formatSummary(results: EnhancedTestResult[]): string {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    let output = '';
    output += `\n📊 TEST EXECUTION SUMMARY\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    output += `Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}\n`;
    output += `Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n\n`;
    
    if (failedTests > 0) {
      output += `❌ FAILED TESTS:\n`;
      const failedResults = results.filter(r => !r.success);
      
      // Group by error type
      const errorGroups = new Map<string, EnhancedTestResult[]>();
      failedResults.forEach(result => {
        const errorType = result.error?.type || 'UNKNOWN_ERROR';
        if (!errorGroups.has(errorType)) {
          errorGroups.set(errorType, []);
        }
        errorGroups.get(errorType)!.push(result);
      });
      
      errorGroups.forEach((tests, errorType) => {
        output += `\n${errorType} (${tests.length} tests):\n`;
        tests.forEach(test => {
          output += `  • ${test.testName}\n`;
          if (test.error?.message) {
            output += `    ${test.error.message.substring(0, 100)}\n`;
          }
        });
      });
    }
    
    return output;
  }
}