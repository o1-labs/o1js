# CI/CD Integration System for Backend Compatibility Testing

This directory contains a comprehensive CI/CD integration system for automated backend compatibility monitoring between Snarky and Sparky backends in o1js.

## 🎯 Purpose

The system provides automated monitoring to immediately alert when VK parity is achieved or when regressions occur, tracking progress toward resolving the critical VK parity blocker systematically.

## 📁 Directory Structure

```
scripts/ci/
├── README.md                      # This documentation
├── run-compatibility-tests.js     # Main CI orchestration script
├── run-quick-tests.sh             # Quick compatibility tests (5-10 minutes)
├── run-comprehensive-tests.sh     # Comprehensive analysis (45-90 minutes)
├── run-full-analysis.sh           # Full VK parity analysis (2-4 hours)
├── Dockerfile.ci                  # Docker environment for consistent testing
├── docker-compose.ci.yml          # Docker orchestration
└── nginx.conf                     # Dashboard server configuration

src/test/pbt/ci/
├── AutomatedReporting.ts           # Compatibility dashboard generation
├── PerformanceMonitoring.ts        # Performance regression detection
└── config.ts                      # Environment-specific configurations
```

## 🚀 Quick Start

### Local Testing

```bash
# Quick compatibility check (5-10 minutes)
npm run test:pbt:ci-quick

# Comprehensive analysis (45-90 minutes)
npm run test:pbt:ci-comprehensive

# Full VK parity analysis (2-4 hours)
npm run test:pbt:ci-full
```

### Using Docker (Recommended for CI)

```bash
# Setup and run quick tests
npm run ci:setup
npm run ci:docker-quick

# Run comprehensive tests
npm run ci:docker-comprehensive

# Run full analysis
npm run ci:docker-full

# Start dashboard server
npm run ci:docker-dashboard
```

## 📊 Test Levels

### 1. Quick Tests (`npm run test:pbt:ci-quick`)
- **Duration**: 5-10 minutes
- **Purpose**: Fast feedback for development
- **Coverage**: Basic VK parity, critical operations, performance check
- **Triggers**: Every commit, PR creation

### 2. Comprehensive Tests (`npm run test:pbt:ci-comprehensive`)
- **Duration**: 45-90 minutes  
- **Purpose**: Detailed compatibility analysis
- **Coverage**: Full VK parity testing, backend infrastructure, constraint analysis
- **Triggers**: Daily scheduled runs, pre-release

### 3. Full Analysis (`npm run test:pbt:ci-full`)
- **Duration**: 2-4 hours
- **Purpose**: Exhaustive investigation of VK parity blockers
- **Coverage**: Deep VK analysis, constraint system investigation, stress testing
- **Triggers**: Weekly scheduled runs, major changes

## 🔧 Configuration

### Environment Variables

```bash
# Test configuration
TEST_LEVEL=quick|comprehensive|full
VERBOSE=true|false
OUTPUT_DIR=./test-results
PERFORMANCE_DIR=./performance-reports
HISTORICAL_DIR=./historical-data

# Notification webhooks
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...

# Email notifications
EMAIL_USERNAME=your-email@domain.com
EMAIL_PASSWORD=your-app-password
NOTIFICATION_EMAIL=team@domain.com
```

### Configuration Profiles

The system supports three configuration profiles:

- **Development**: Fast feedback, relaxed thresholds
- **CI**: Balanced performance and thoroughness  
- **Production**: Strict thresholds, comprehensive testing

Automatically selected based on `NODE_ENV` and `TEST_ENV` environment variables.

## 📈 Monitoring & Alerts

### Automated Notifications

The system sends notifications for:

- 🎉 **VK Parity Achievement**: 100% compatibility reached
- 📈 **Significant Progress**: >50% VK parity rate
- ⚠️ **Regressions**: Compatibility decreases
- 🚨 **Critical Failures**: New critical test failures
- 🐌 **Performance Issues**: Unacceptable performance degradation

### Dashboard

Access the compatibility dashboard at:
- Local: `compatibility-dashboard/index.html`
- Docker: `http://localhost:8080`

The dashboard includes:
- Real-time VK parity tracking
- Performance trend analysis
- Historical progress charts
- Regression alerts
- Recommendations for next steps

## 🔍 Understanding Results

### Key Metrics

- **VK Parity Rate**: Percentage of verification keys that match between backends
- **Performance Ratio**: Sparky execution time / Snarky execution time
- **Critical Failures**: Number of essential tests failing
- **Constraint Accuracy**: Accuracy of constraint generation

### Critical Blockers (Current Status)

1. **VK Hash Uniformity**: All Sparky VKs generate identical hash
2. **Missing `reduce_lincom`**: Causes different constraint counts
3. **Constraint Routing Bug**: `globalThis.__snarky` not updated correctly

### Progress Phases

1. **Foundation**: Basic infrastructure setup
2. **Initial Compatibility**: First VK matches achieved
3. **Major Compatibility**: >50% VK parity
4. **Final Fixes**: >80% VK parity, edge cases
5. **Optimization**: 100% parity, performance tuning

## 🛠 Troubleshooting

### Common Issues

#### VK Parity Failures
```bash
# Check constraint generation differences
npm run test:constraint-analysis

# Investigate VK generation step-by-step
npm run test:vk-generation:detailed

# Compare constraint counts
npm run test:constraint-count-analysis
```

#### Performance Regressions
```bash
# Profile performance bottlenecks
npm run monitor:performance

# Check memory usage
npm run test:memory-usage:detailed

# Compare optimization passes
npm run test:constraint-performance
```

#### Backend Switching Issues
```bash
# Test backend routing
npm run test:backend-infrastructure

# Check globalThis updates
npm run test:globalthis-snarky-update

# Verify state consistency
npm run test:backend-state-consistency
```

### Debug Mode

Enable detailed debugging:
```bash
export VERBOSE=true
export RUST_BACKTRACE=full
export DETAILED_LOGGING=true
```

### Log Analysis

Check logs in order of importance:
1. `test-results/` - Main test results
2. `vk-analysis/` - VK parity investigation
3. `constraint-analysis/` - Constraint system issues  
4. `performance-reports/` - Performance data

## 🚀 GitHub Actions Integration

The system includes a comprehensive GitHub Actions workflow (`.github/workflows/backend-compatibility.yml`) that:

- Runs progressive tests (quick → comprehensive → full)
- Generates and archives compatibility reports
- Sends notifications on significant events
- Stores historical data for trend analysis
- Creates artifacts for post-run analysis

### Workflow Triggers

- **Push/PR**: Quick tests for fast feedback
- **Daily Schedule**: Comprehensive tests at 2 AM UTC
- **Manual Dispatch**: Any test level with notification control

## 📋 Integration Checklist

To integrate this system into your CI/CD pipeline:

- [ ] Configure notification webhooks in secrets
- [ ] Set up email notifications (optional)
- [ ] Configure test environments (dev/ci/prod)
- [ ] Set up artifact storage
- [ ] Configure dashboard hosting (optional)
- [ ] Schedule regular test runs
- [ ] Set up monitoring alerts
- [ ] Train team on result interpretation

## 📚 Additional Resources

- **CLAUDE.md**: Project-specific development guidance
- **DEV.md**: Technical documentation and backend details
- **VK Parity Tests**: `src/test/vk-parity-comprehensive.test.ts`
- **Backend Infrastructure**: `src/test/backend-infrastructure.test.ts`
- **Constraint Analysis**: `src/test/constraint-system-analysis.test.ts`

## 🤝 Contributing

When contributing to the CI/CD system:

1. Test changes locally with Docker first
2. Update this README for new features
3. Follow the existing naming patterns for scripts
4. Ensure backward compatibility with existing workflows
5. Add appropriate error handling and logging

## 📞 Support

For issues with the CI/CD system:

1. Check logs in `test-results/` directory
2. Review system requirements and dependencies
3. Verify environment variable configuration
4. Check Docker setup if using containerized testing
5. Consult the troubleshooting section above

The system is designed to provide immediate feedback on VK parity progress and catch regressions early. Regular monitoring will help track progress toward resolving the critical compatibility blockers.