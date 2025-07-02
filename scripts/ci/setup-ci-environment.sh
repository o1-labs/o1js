#!/bin/bash
# CI/CD Environment Setup Script
# Sets up directories, validates environment, and prepares system for compatibility testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}${BLUE}🔧 Setting up CI/CD Environment for Backend Compatibility Testing${NC}"
echo ""

# Configuration
BASE_DIR="$(pwd)"
REQUIRED_DIRS=(
    "test-results"
    "performance-reports"
    "historical-data"
    "compatibility-dashboard"
    "vk-analysis"
    "constraint-analysis"
)

# Function to check command availability
check_command() {
    local cmd="$1"
    local description="$2"
    local required="$3"
    
    if command -v "$cmd" &> /dev/null; then
        echo -e "${GREEN}✅ $description available${NC}"
        return 0
    else
        if [ "$required" = "true" ]; then
            echo -e "${RED}❌ $description is required but not found${NC}"
            return 1
        else
            echo -e "${YELLOW}⚠️  $description not found (optional)${NC}"
            return 0
        fi
    fi
}

# Function to create directory with proper permissions
create_directory() {
    local dir="$1"
    
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        echo -e "${GREEN}✅ Created directory: $dir${NC}"
    else
        echo -e "${CYAN}📁 Directory exists: $dir${NC}"
    fi
    
    # Ensure directory is writable
    if [ ! -w "$dir" ]; then
        echo -e "${RED}❌ Directory not writable: $dir${NC}"
        return 1
    fi
}

# 1. Create required directories
echo -e "${BLUE}📁 Creating required directories...${NC}"
for dir in "${REQUIRED_DIRS[@]}"; do
    create_directory "$dir"
done
echo ""

# 2. Check system prerequisites
echo -e "${BLUE}🔍 Checking system prerequisites...${NC}"

has_errors=false

# Essential tools
if ! check_command "node" "Node.js" "true"; then
    has_errors=true
fi

if ! check_command "npm" "npm" "true"; then
    has_errors=true
fi

if ! check_command "git" "Git" "true"; then
    has_errors=true
fi

# Check Node.js version
if command -v node &> /dev/null; then
    node_version=$(node --version | sed 's/v//')
    required_version="18.14.0"
    
    if npx semver --range ">=$required_version" "$node_version" &>/dev/null; then
        echo -e "${GREEN}✅ Node.js version $node_version is compatible${NC}"
    else
        echo -e "${RED}❌ Node.js version $node_version is too old. Required: >=$required_version${NC}"
        has_errors=true
    fi
fi

# Rust for Sparky backend
if ! check_command "cargo" "Rust/Cargo" "true"; then
    echo -e "${YELLOW}💡 Install Rust: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh${NC}"
    has_errors=true
fi

if ! check_command "rustc" "Rust compiler" "true"; then
    has_errors=true
fi

# Optional but recommended tools
check_command "jq" "jq (JSON processor)" "false"
check_command "bc" "bc (calculator)" "false"
check_command "docker" "Docker" "false"
check_command "docker-compose" "Docker Compose" "false"

echo ""

# 3. Check system resources
echo -e "${BLUE}💾 Checking system resources...${NC}"

# Memory check
if [ -f "/proc/meminfo" ]; then
    total_memory=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    memory_gb=$((total_memory / 1024 / 1024))
    
    if [ $memory_gb -ge 8 ]; then
        echo -e "${GREEN}✅ Memory: ${memory_gb}GB (sufficient for full analysis)${NC}"
    elif [ $memory_gb -ge 4 ]; then
        echo -e "${YELLOW}⚠️  Memory: ${memory_gb}GB (sufficient for comprehensive tests)${NC}"
    else
        echo -e "${RED}❌ Memory: ${memory_gb}GB (may cause issues with full analysis)${NC}"
        has_errors=true
    fi
else
    echo -e "${YELLOW}⚠️  Could not determine memory size${NC}"
fi

# Disk space check
available_space=$(df . | tail -1 | awk '{print $4}')
available_gb=$((available_space / 1024 / 1024))

if [ $available_gb -ge 10 ]; then
    echo -e "${GREEN}✅ Disk space: ${available_gb}GB available${NC}"
elif [ $available_gb -ge 5 ]; then
    echo -e "${YELLOW}⚠️  Disk space: ${available_gb}GB available (sufficient for basic testing)${NC}"
else
    echo -e "${RED}❌ Disk space: ${available_gb}GB available (may cause issues)${NC}"
    has_errors=true
fi

# CPU cores
if command -v nproc &> /dev/null; then
    cpu_cores=$(nproc)
    echo -e "${GREEN}✅ CPU cores: $cpu_cores${NC}"
elif [ -f "/proc/cpuinfo" ]; then
    cpu_cores=$(grep -c "^processor" /proc/cpuinfo)
    echo -e "${GREEN}✅ CPU cores: $cpu_cores${NC}"
else
    echo -e "${YELLOW}⚠️  Could not determine CPU core count${NC}"
fi

echo ""

# 4. Check project build status
echo -e "${BLUE}🔨 Checking project build status...${NC}"

if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Not in o1js project root directory${NC}"
    has_errors=true
fi

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Dependencies not installed. Run: npm install${NC}"
    has_errors=true
fi

if [ ! -d "dist" ] || [ ! -f "dist/node/index.js" ]; then
    echo -e "${YELLOW}⚠️  Project not built. Run: npm run build${NC}"
fi

# Check for Sparky build
if [ ! -f "src/sparky/target/wasm32-unknown-unknown/release/sparky.wasm" ]; then
    echo -e "${YELLOW}⚠️  Sparky not built. Run: npm run build:sparky${NC}"
fi

echo ""

# 5. Environment variable validation
echo -e "${BLUE}🌍 Checking environment variables...${NC}"

# Check for CI environment
if [ "$CI" = "true" ]; then
    echo -e "${GREEN}✅ CI environment detected${NC}"
    
    # Check GitHub Actions specific variables
    if [ -n "$GITHUB_ACTIONS" ]; then
        echo -e "${GREEN}✅ GitHub Actions environment${NC}"
        echo "  Run ID: ${GITHUB_RUN_ID:-not-set}"
        echo "  Actor: ${GITHUB_ACTOR:-not-set}"
    fi
else
    echo -e "${CYAN}🖥️  Local development environment${NC}"
fi

# Check notification webhooks (optional)
webhook_count=0
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    echo -e "${GREEN}✅ Slack webhook configured${NC}"
    webhook_count=$((webhook_count + 1))
fi

if [ -n "$DISCORD_WEBHOOK_URL" ]; then
    echo -e "${GREEN}✅ Discord webhook configured${NC}"
    webhook_count=$((webhook_count + 1))
fi

if [ -n "$TEAMS_WEBHOOK_URL" ]; then
    echo -e "${GREEN}✅ Teams webhook configured${NC}"
    webhook_count=$((webhook_count + 1))
fi

if [ $webhook_count -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No notification webhooks configured${NC}"
else
    echo -e "${GREEN}✅ $webhook_count notification webhook(s) configured${NC}"
fi

echo ""

# 6. Validate CI scripts
echo -e "${BLUE}📜 Validating CI scripts...${NC}"

CI_SCRIPTS=(
    "scripts/ci/run-compatibility-tests.js"
    "scripts/ci/run-quick-tests.sh"
    "scripts/ci/run-comprehensive-tests.sh"
    "scripts/ci/run-full-analysis.sh"
)

for script in "${CI_SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            echo -e "${GREEN}✅ $script (executable)${NC}"
        else
            echo -e "${YELLOW}⚠️  $script (not executable, fixing...)${NC}"
            chmod +x "$script"
        fi
    else
        echo -e "${RED}❌ $script missing${NC}"
        has_errors=true
    fi
done

# Check TypeScript files
TS_FILES=(
    "src/test/pbt/ci/AutomatedReporting.ts"
    "src/test/pbt/ci/PerformanceMonitoring.ts"
    "src/test/pbt/ci/config.ts"
)

for ts_file in "${TS_FILES[@]}"; do
    if [ -f "$ts_file" ]; then
        echo -e "${GREEN}✅ $ts_file${NC}"
    else
        echo -e "${RED}❌ $ts_file missing${NC}"
        has_errors=true
    fi
done

echo ""

# 7. Test a simple compatibility check
echo -e "${BLUE}🧪 Running basic compatibility test...${NC}"

if command -v npm &> /dev/null && [ -f "package.json" ]; then
    echo "Testing basic script execution..."
    
    if timeout 30 node -e "
        console.log('Testing CI system basic functionality...');
        const config = require('./src/test/pbt/ci/config.ts');
        console.log('Configuration loaded successfully');
        console.log('Environment:', config.getConfiguration().environment);
        console.log('✅ Basic CI system test passed');
    " 2>/dev/null; then
        echo -e "${GREEN}✅ Basic CI system test passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Basic CI system test failed (may need build)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Skipping basic test (npm or package.json not available)${NC}"
fi

echo ""

# 8. Summary and recommendations
echo -e "${BOLD}${BLUE}📋 Setup Summary${NC}"
echo "=================================="

if [ "$has_errors" = "true" ]; then
    echo -e "${RED}❌ Setup completed with errors${NC}"
    echo ""
    echo -e "${YELLOW}Required actions before running CI tests:${NC}"
    echo "1. Install missing required tools"
    echo "2. Address system resource issues"
    echo "3. Build the project: npm run build"
    echo "4. Build Sparky backend: npm run build:sparky"
    echo ""
else
    echo -e "${GREEN}✅ Setup completed successfully!${NC}"
    echo ""
fi

echo -e "${BLUE}Next steps:${NC}"
echo "• Quick test: npm run test:pbt:ci-quick"
echo "• Comprehensive: npm run test:pbt:ci-comprehensive"
echo "• Full analysis: npm run test:pbt:ci-full"
echo "• Docker setup: npm run ci:docker-quick"
echo ""

echo -e "${BLUE}Configuration summary:${NC}"
echo "• Working directory: $BASE_DIR"
echo "• Test results: test-results/"
echo "• Performance data: performance-reports/"
echo "• Dashboard: compatibility-dashboard/"
echo "• VK analysis: vk-analysis/"
echo ""

# 9. Create sample environment file
echo -e "${BLUE}📝 Creating sample environment file...${NC}"

cat > .env.ci.sample << 'EOF'
# CI/CD Environment Configuration for Backend Compatibility Testing

# Test Configuration
TEST_LEVEL=quick
VERBOSE=false
NODE_ENV=ci
TEST_ENV=ci

# Output Directories
OUTPUT_DIR=./test-results
PERFORMANCE_DIR=./performance-reports
HISTORICAL_DIR=./historical-data
DASHBOARD_DIR=./compatibility-dashboard

# Notification Webhooks (optional)
# SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
# DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK/URL
# TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/YOUR/WEBHOOK/URL

# Email Notifications (optional)
# EMAIL_USERNAME=your-email@domain.com
# EMAIL_PASSWORD=your-app-password
# NOTIFICATION_EMAIL=team@domain.com

# Debug Settings
# RUST_BACKTRACE=1
# DETAILED_LOGGING=false

# Docker Settings
# DOCKER_BUILDKIT=1
# COMPOSE_DOCKER_CLI_BUILD=1
EOF

echo -e "${GREEN}✅ Created .env.ci.sample${NC}"
echo "Copy to .env.ci and customize for your environment"

echo ""
echo -e "${BOLD}${GREEN}🎉 CI/CD Environment Setup Complete!${NC}"

if [ "$has_errors" = "true" ]; then
    exit 1
else
    exit 0
fi