/**
 * Configuration Management for CI/CD Backend Compatibility Testing
 * 
 * Handles:
 * - Environment-specific test configurations
 * - Test parallelization for CI efficiency
 * - Timeout and resource management
 * - Failure tolerance configurations
 */

export interface TestConfiguration {
  // Environment settings
  environment: 'development' | 'ci' | 'production';
  
  // Test execution settings
  parallelism: {
    maxConcurrentTests: number;
    maxConcurrentOperations: number;
    chunkSize: number;
  };
  
  // Timeout settings (in milliseconds)
  timeouts: {
    quickTests: number;
    comprehensiveTests: number;
    fullAnalysis: number;
    singleOperation: number;
    vkGeneration: number;
    proofGeneration: number;
  };
  
  // Resource limits
  resources: {
    maxMemoryUsage: number; // bytes
    maxCpuUsage: number; // percentage
    diskSpaceReserved: number; // bytes
  };
  
  // Failure tolerance
  failureTolerance: {
    allowedFailureRate: number; // 0.0 to 1.0
    retryAttempts: number;
    retryDelay: number; // milliseconds
    circuitBreakerThreshold: number;
    gracefulDegradation: boolean;
  };
  
  // Test selection
  testSelection: {
    quickTestOperations: string[];
    comprehensiveTestOperations: string[];
    fullAnalysisOperations: string[];
    criticalOperations: string[]; // Must always pass
  };
  
  // Performance thresholds
  performanceThresholds: {
    acceptable: {
      durationRatio: number;
      memoryRatio: number;
    };
    warning: {
      durationRatio: number;
      memoryRatio: number;
    };
    critical: {
      durationRatio: number;
      memoryRatio: number;
    };
  };
  
  // Reporting settings
  reporting: {
    generateHtmlDashboard: boolean;
    generateJsonReports: boolean;
    generateMarkdownSummary: boolean;
    uploadArtifacts: boolean;
    retentionDays: number;
  };
  
  // Notification settings
  notifications: {
    enabled: boolean;
    channels: ('slack' | 'discord' | 'teams' | 'email')[];
    conditions: {
      onSuccess: boolean;
      onFailure: boolean;
      onRegression: boolean;
      onBreakthrough: boolean;
      onThresholdExceeded: boolean;
    };
  };
}

// Development configuration - fast feedback, relaxed thresholds
export const developmentConfig: TestConfiguration = {
  environment: 'development',
  
  parallelism: {
    maxConcurrentTests: 2,
    maxConcurrentOperations: 1,
    chunkSize: 5
  },
  
  timeouts: {
    quickTests: 5 * 60 * 1000, // 5 minutes
    comprehensiveTests: 15 * 60 * 1000, // 15 minutes
    fullAnalysis: 30 * 60 * 1000, // 30 minutes
    singleOperation: 30 * 1000, // 30 seconds
    vkGeneration: 60 * 1000, // 1 minute
    proofGeneration: 120 * 1000 // 2 minutes
  },
  
  resources: {
    maxMemoryUsage: 2 * 1024 * 1024 * 1024, // 2GB
    maxCpuUsage: 80, // 80%
    diskSpaceReserved: 1 * 1024 * 1024 * 1024 // 1GB
  },
  
  failureTolerance: {
    allowedFailureRate: 0.2, // 20% failure rate allowed
    retryAttempts: 2,
    retryDelay: 1000, // 1 second
    circuitBreakerThreshold: 5,
    gracefulDegradation: true
  },
  
  testSelection: {
    quickTestOperations: [
      'field_operations',
      'poseidon_hash',
      'basic_constraints'
    ],
    comprehensiveTestOperations: [
      'field_operations',
      'poseidon_hash',
      'ec_operations',
      'range_check',
      'lookup_table',
      'constraint_generation'
    ],
    fullAnalysisOperations: [
      'field_operations',
      'poseidon_hash',
      'ec_operations',
      'range_check',
      'lookup_table',
      'foreign_field',
      'constraint_generation',
      'vk_generation',
      'proof_generation'
    ],
    criticalOperations: [
      'field_operations',
      'poseidon_hash'
    ]
  },
  
  performanceThresholds: {
    acceptable: {
      durationRatio: 3.0, // 3x slower is acceptable in dev
      memoryRatio: 2.0 // 2x more memory is acceptable
    },
    warning: {
      durationRatio: 5.0,
      memoryRatio: 3.0
    },
    critical: {
      durationRatio: 10.0,
      memoryRatio: 5.0
    }
  },
  
  reporting: {
    generateHtmlDashboard: true,
    generateJsonReports: true,
    generateMarkdownSummary: false,
    uploadArtifacts: false,
    retentionDays: 7
  },
  
  notifications: {
    enabled: false,
    channels: [],
    conditions: {
      onSuccess: false,
      onFailure: true,
      onRegression: true,
      onBreakthrough: true,
      onThresholdExceeded: false
    }
  }
};

// CI configuration - balanced performance and thoroughness
export const ciConfig: TestConfiguration = {
  environment: 'ci',
  
  parallelism: {
    maxConcurrentTests: 4,
    maxConcurrentOperations: 2,
    chunkSize: 10
  },
  
  timeouts: {
    quickTests: 10 * 60 * 1000, // 10 minutes
    comprehensiveTests: 45 * 60 * 1000, // 45 minutes
    fullAnalysis: 120 * 60 * 1000, // 2 hours
    singleOperation: 60 * 1000, // 1 minute
    vkGeneration: 180 * 1000, // 3 minutes
    proofGeneration: 300 * 1000 // 5 minutes
  },
  
  resources: {
    maxMemoryUsage: 6 * 1024 * 1024 * 1024, // 6GB
    maxCpuUsage: 90, // 90%
    diskSpaceReserved: 5 * 1024 * 1024 * 1024 // 5GB
  },
  
  failureTolerance: {
    allowedFailureRate: 0.1, // 10% failure rate allowed
    retryAttempts: 3,
    retryDelay: 2000, // 2 seconds
    circuitBreakerThreshold: 3,
    gracefulDegradation: true
  },
  
  testSelection: {
    quickTestOperations: [
      'field_operations',
      'poseidon_hash',
      'ec_operations',
      'basic_constraints',
      'range_check'
    ],
    comprehensiveTestOperations: [
      'field_operations',
      'poseidon_hash',
      'ec_operations',
      'range_check',
      'lookup_table',
      'foreign_field',
      'constraint_generation',
      'vk_generation'
    ],
    fullAnalysisOperations: [
      'field_operations',
      'poseidon_hash',
      'ec_operations',
      'range_check',
      'lookup_table',
      'foreign_field',
      'constraint_generation',
      'vk_generation',
      'proof_generation',
      'batch_operations',
      'recursive_proofs'
    ],
    criticalOperations: [
      'field_operations',
      'poseidon_hash',
      'constraint_generation'
    ]
  },
  
  performanceThresholds: {
    acceptable: {
      durationRatio: 2.0, // 2x slower is acceptable
      memoryRatio: 1.5 // 1.5x more memory is acceptable
    },
    warning: {
      durationRatio: 3.0,
      memoryRatio: 2.0
    },
    critical: {
      durationRatio: 5.0,
      memoryRatio: 3.0
    }
  },
  
  reporting: {
    generateHtmlDashboard: true,
    generateJsonReports: true,
    generateMarkdownSummary: true,
    uploadArtifacts: true,
    retentionDays: 30
  },
  
  notifications: {
    enabled: true,
    channels: ['slack'],
    conditions: {
      onSuccess: false,
      onFailure: true,
      onRegression: true,
      onBreakthrough: true,
      onThresholdExceeded: true
    }
  }
};

// Production configuration - strict thresholds, comprehensive testing
export const productionConfig: TestConfiguration = {
  environment: 'production',
  
  parallelism: {
    maxConcurrentTests: 8,
    maxConcurrentOperations: 4,
    chunkSize: 20
  },
  
  timeouts: {
    quickTests: 15 * 60 * 1000, // 15 minutes
    comprehensiveTests: 90 * 60 * 1000, // 1.5 hours
    fullAnalysis: 240 * 60 * 1000, // 4 hours
    singleOperation: 120 * 1000, // 2 minutes
    vkGeneration: 300 * 1000, // 5 minutes
    proofGeneration: 600 * 1000 // 10 minutes
  },
  
  resources: {
    maxMemoryUsage: 16 * 1024 * 1024 * 1024, // 16GB
    maxCpuUsage: 95, // 95%
    diskSpaceReserved: 10 * 1024 * 1024 * 1024 // 10GB
  },
  
  failureTolerance: {
    allowedFailureRate: 0.05, // 5% failure rate allowed
    retryAttempts: 5,
    retryDelay: 5000, // 5 seconds
    circuitBreakerThreshold: 2,
    gracefulDegradation: false
  },
  
  testSelection: {
    quickTestOperations: [
      'field_operations',
      'poseidon_hash',
      'ec_operations',
      'range_check',
      'lookup_table',
      'constraint_generation'
    ],
    comprehensiveTestOperations: [
      'field_operations',
      'poseidon_hash',
      'ec_operations',
      'range_check',
      'lookup_table',
      'foreign_field',
      'constraint_generation',
      'vk_generation',
      'proof_generation',
      'batch_operations'
    ],
    fullAnalysisOperations: [
      'field_operations',
      'poseidon_hash',
      'ec_operations',
      'range_check',
      'lookup_table',
      'foreign_field',
      'constraint_generation',
      'vk_generation',
      'proof_generation',
      'batch_operations',
      'recursive_proofs',
      'stress_tests',
      'edge_cases',
      'compatibility_matrix'
    ],
    criticalOperations: [
      'field_operations',
      'poseidon_hash',
      'constraint_generation',
      'vk_generation'
    ]
  },
  
  performanceThresholds: {
    acceptable: {
      durationRatio: 1.5, // 1.5x slower is acceptable
      memoryRatio: 1.3 // 1.3x more memory is acceptable
    },
    warning: {
      durationRatio: 2.0,
      memoryRatio: 1.5
    },
    critical: {
      durationRatio: 3.0,
      memoryRatio: 2.0
    }
  },
  
  reporting: {
    generateHtmlDashboard: true,
    generateJsonReports: true,
    generateMarkdownSummary: true,
    uploadArtifacts: true,
    retentionDays: 90
  },
  
  notifications: {
    enabled: true,
    channels: ['slack', 'email'],
    conditions: {
      onSuccess: true,
      onFailure: true,
      onRegression: true,
      onBreakthrough: true,
      onThresholdExceeded: true
    }
  }
};

// Configuration selector based on environment
export function getConfiguration(): TestConfiguration {
  const env = process.env.NODE_ENV || 'development';
  const testEnv = process.env.TEST_ENV;
  
  // Allow explicit test environment override
  if (testEnv === 'ci') return ciConfig;
  if (testEnv === 'production') return productionConfig;
  if (testEnv === 'development') return developmentConfig;
  
  // Default based on NODE_ENV
  switch (env) {
    case 'production':
      return productionConfig;
    case 'test':
    case 'ci':
      return ciConfig;
    case 'development':
    default:
      return developmentConfig;
  }
}

// Environment validation
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const config = getConfiguration();
  
  // Check required environment variables for CI
  if (config.environment === 'ci') {
    if (config.notifications.enabled && config.notifications.channels.includes('slack')) {
      if (!process.env.SLACK_WEBHOOK_URL) {
        errors.push('SLACK_WEBHOOK_URL is required for Slack notifications');
      }
    }
    
    if (config.notifications.enabled && config.notifications.channels.includes('email')) {
      if (!process.env.EMAIL_USERNAME || !process.env.EMAIL_PASSWORD) {
        errors.push('EMAIL_USERNAME and EMAIL_PASSWORD are required for email notifications');
      }
    }
  }
  
  // Check system resources
  const availableMemory = process.memoryUsage().heapTotal;
  if (availableMemory < config.resources.maxMemoryUsage * 0.5) {
    errors.push(`Insufficient memory: need at least ${config.resources.maxMemoryUsage / (1024 * 1024 * 1024)}GB`);
  }
  
  // Check disk space (simplified check)
  if (process.env.CI && !process.env.SKIP_DISK_CHECK) {
    // In real implementation, would check actual disk space
    console.warn('Skipping disk space check in CI environment');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Runtime configuration adjustment
export function adjustConfigurationForRuntime(config: TestConfiguration): TestConfiguration {
  const adjusted = { ...config };
  
  // Adjust parallelism based on available CPU cores
  const cpuCores = require('os').cpus().length;
  adjusted.parallelism.maxConcurrentTests = Math.min(
    adjusted.parallelism.maxConcurrentTests,
    Math.max(1, cpuCores - 1)
  );
  
  // Adjust memory limits based on available memory
  const totalMemory = require('os').totalmem();
  adjusted.resources.maxMemoryUsage = Math.min(
    adjusted.resources.maxMemoryUsage,
    totalMemory * 0.8 // Use at most 80% of total memory
  );
  
  // Reduce timeouts in CI if running on slower hardware
  if (process.env.CI && process.env.SLOW_HARDWARE === 'true') {
    Object.keys(adjusted.timeouts).forEach(key => {
      adjusted.timeouts[key as keyof typeof adjusted.timeouts] *= 1.5;
    });
  }
  
  return adjusted;
}

// Export current configuration
export const config = adjustConfigurationForRuntime(getConfiguration());