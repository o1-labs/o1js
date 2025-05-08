#!/usr/bin/env bash
set -e

echo "Running all local tests"

echo "Running jest tests"
./run-jest-tests.sh

echo "Running integration tests"
./run-integration-tests.sh

echo "Running unit tests"
./run-unit-tests.sh

echo "Running e2e tests"
rimraf ./tests/report && rimraf ./tests/test-artifacts && npx playwright test"