# o1js Makefile
# Use this file to run the same commands defined in package.json

# Ensure all commands are executed in the same shell with exit on error
.SHELLFLAGS := -ec

# Disable verbose output from commands (silent mode)
.SILENT:

# Default target
.PHONY: all
all: build

# Help command
.PHONY: help
help:
	echo "o1js Makefile - Available commands by category:"
	echo
	echo "BASIC COMMANDS:"
	echo "  all                   - Default target (builds o1js for Node.js)"
	echo "  help                  - Display this help message"
	echo
	echo "DEVELOPMENT:"
	echo "  dev                   - Compile TypeScript and copy to dist"
	echo "  install               - Install Node.js dependencies"
	echo "  install-ci            - Install Node.js dependencies (CI mode)"
	echo
	echo "BUILD COMMANDS:"
	echo "  build                 - Build o1js for Node.js"
	echo "  build-web             - Build o1js for browsers"
	echo "  build-examples        - Build example files"
	echo "  build-docs            - Generate documentation"
	echo
	echo "BINDINGS:"
	echo "  build-bindings        - Build o1js node bindings"
	echo "  build-wasm            - Update WebAssembly files"
	echo "  update-bindings       - Update o1js bindings"
	echo
	echo "TESTING:"
	echo "  test                  - Run Jest tests"
	echo "  test-unit             - Run unit tests"
	echo "  test-integration      - Run integration tests"
	echo "  test-all              - Run all local tests"
	echo "  dump-vks              - Dump verification keys"
	echo
	echo "END-TO-END TESTING:"
	echo "  test-e2e              - Run end-to-end tests"
	echo "  e2e-install           - Install Playwright dependencies"
	echo "  e2e-prepare-server    - Prepare server for E2E tests"
	echo "  e2e-run-server        - Run server for E2E tests"
	echo "  e2e-show-report       - Show Playwright test reports"
	echo
	echo "CODE QUALITY:"
	echo "  format                - Format code with Prettier"
	echo "  format-check          - Check formatting with Prettier"
	echo "  lint                  - Lint code with oxlint"
	echo "  lint-fix              - Fix linting issues with oxlint"
	echo "  lint-strict           - Lint with zero warnings allowed"
	echo
	echo "CLEANING:"
	echo "  clean                 - Clean built files"
	echo "  clean-all             - Clean all generated files including test artifacts"
	echo
	echo "PUBLISHING:"
	echo "  prepublish            - Prepare package for publishing"
	echo "  prepublish-web        - Prepare web package for publishing"
	echo "  prepublish-node       - Prepare node package for publishing"
	echo
	echo "MISCELLANEOUS:"
	echo "  check-commit          - Check commit for bindings issues"
	echo "  prepare               - Run Husky install"
	echo "  update-changelog      - Update changelog"
	echo

# All targets listed alphabetically

.PHONY: build
build:
	echo "Building o1js for Node.js..."
	node src/build/copy-artifacts.js
	rm -rf ./dist/node
	npm run dev
	node src/build/build-node.js
	echo "Build complete."

.PHONY: build-bindings
build-bindings:
	echo "Building o1js node bindings..."
	./src/bindings/scripts/build-o1js-node.sh
	echo "Bindings built."

.PHONY: build-docs
build-docs:
	echo "Generating documentation..."
	npx typedoc
	echo "Documentation generated."

.PHONY: build-examples
build-examples:
	echo "Building examples..."
	npm run build
	rm -rf ./dist/examples
	npx tsc -p tsconfig.examples.json
	npx tsc -p benchmark/tsconfig.json
	echo "Examples built."

.PHONY: build-wasm
build-wasm:
	echo "Updating WebAssembly files..."
	./src/bindings/scripts/update-wasm-and-types.sh
	echo "WASM update complete."

.PHONY: build-web
build-web:
	echo "Building o1js for browsers..."
	rm -rf ./dist/web
	node src/build/build-web.js
	echo "Web build complete."

.PHONY: check-commit
check-commit:
	echo "Checking commit for bindings issues..."
	./src/bindings/scripts/check-commit.sh
	echo "Commit check complete."

.PHONY: clean
clean:
	echo "Cleaning built files..."
	rm -rf ./dist
	rm -rf ./src/bindings/compiled/_node_bindings
	echo "Clean complete."

.PHONY: clean-all
clean-all:
	echo "Cleaning all generated files..."
	npm run clean
	rm -rf ./tests/report
	rm -rf ./tests/test-artifacts
	echo "Clean all complete."

.PHONY: dev
dev:
	echo "Compiling TypeScript and copying to dist..."
	npx tsc -p tsconfig.test.json
	node src/build/copy-to-dist.js
	echo "Development build complete."

.PHONY: dump-vks
dump-vks:
	echo "Dumping verification keys..."
	npm run build
	./run tests/vk-regression/vk-regression.ts --bundle --dump
	echo "Verification keys dumped."

.PHONY: e2e-install
e2e-install:
	echo "Installing Playwright dependencies..."
	npx playwright install --with-deps
	echo "Playwright dependencies installed."

.PHONY: e2e-prepare-server
e2e-prepare-server:
	echo "Preparing server for E2E tests..."
	npm run build:examples
	cp -rf dist/examples dist/web
	node src/build/e2e-tests-build-helper.js
	cp -rf src/examples/plain-html/index.html src/examples/plain-html/server.js tests/artifacts/html/*.html tests/artifacts/javascript/*.js dist/web
	echo "Server prepared for E2E tests."

.PHONY: e2e-run-server
e2e-run-server:
	echo "Running server for E2E tests..."
	node dist/web/server.js

.PHONY: e2e-show-report
e2e-show-report:
	echo "Showing Playwright test reports..."
	npx playwright show-report tests/report

.PHONY: format
format:
	echo "Formatting code with Prettier..."
	prettier --write --ignore-unknown
	echo "Formatting complete."

.PHONY: format-check
format-check:
	echo "Checking formatting with Prettier..."
	prettier --check --ignore-unknown
	echo "Format check complete."

.PHONY: install
install:
	echo "Installing Node.js dependencies..."
	npm install
	echo "Node.js dependencies installed."

.PHONY: install-ci
install-ci:
	echo "Installing Node.js dependencies (CI mode)..."
	npm ci
	echo "Node.js dependencies installed (CI mode)."

.PHONY: lint
lint:
	echo "Linting code with oxlint..."
	npx oxlint
	echo "Linting complete."

.PHONY: lint-fix
lint-fix:
	echo "Fixing linting issues with oxlint..."
	npx oxlint --fix --fix-suggestions
	echo "Linting fixes applied."

.PHONY: lint-strict
lint-strict:
	echo "Strict linting with oxlint (no warnings)..."
	npx oxlint --max-warnings 0
	echo "Strict linting complete."

.PHONY: prepare
prepare:
	echo "Running Husky install..."
	husky
	echo "Husky installation complete."

.PHONY: prepublish
prepublish:
	echo "Preparing package for publishing..."
	npm run prepublish:web
	npm run prepublish:node
	echo "Package ready for publishing."

.PHONY: prepublish-node
prepublish-node:
	echo "Preparing node package for publishing..."
	node src/build/copy-artifacts.js
	rm -rf ./dist/node
	npx tsc -p tsconfig.node.json
	node src/build/copy-to-dist.js
	NODE_ENV=production node src/build/build-node.js
	echo "Node package ready for publishing."

.PHONY: prepublish-web
prepublish-web:
	echo "Preparing web package for publishing..."
	NODE_ENV=production node src/build/build-web.js
	echo "Web package ready for publishing."

.PHONY: test
test:
	echo "Running Jest tests..."
	./run-jest-tests.sh
	echo "Tests complete."

.PHONY: test-all
test-all:
	echo "Running all local tests..."
	./run-all-local-tests.sh
	echo "All tests complete."

.PHONY: test-e2e
test-e2e:
	echo "Running end-to-end tests..."
	rm -rf ./tests/report
	rm -rf ./tests/test-artifacts
	npx playwright test
	echo "E2E tests complete."

.PHONY: test-integration
test-integration:
	echo "Running integration tests..."
	./run-integration-tests.sh
	echo "Integration tests complete."

.PHONY: test-unit
test-unit:
	echo "Running unit tests..."
	./run-unit-tests.sh
	echo "Unit tests complete."

.PHONY: update-bindings
update-bindings:
	echo "Updating o1js bindings..."
	./src/bindings/scripts/update-o1js-bindings.sh
	echo "Bindings updated."

.PHONY: update-changelog
update-changelog:
	echo "Updating changelog..."
	./update-changelog.sh
	echo "Changelog updated."
