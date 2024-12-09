#!/usr/bin/env bash
set -e

case $TEST_TYPE in
"Simple integration tests")
  echo "Running basic integration tests"
  ./run src/examples/zkapps/hello-world/run.ts --bundle
  ./run src/examples/simple-zkapp.ts --bundle
  ./run src/examples/zkapps/reducer/reducer-composite.ts --bundle
  ./run src/examples/zkapps/composability.ts --bundle
  ./run src/tests/fake-proof.ts
  ./run src/tests/inductive-proofs-internal.ts --bundle
  ./run tests/vk-regression/diverse-zk-program-run.ts --bundle
  ;;

"Reducer integration tests")
  echo "Running reducer integration tests"
  ./run src/examples/zkapps/reducer/run.ts --bundle
  ;;

"Voting integration tests")
  echo "Running voting integration tests"
  ./run src/examples/zkapps/voting/run.ts --bundle
  ;;

"DEX integration tests")
  echo "Running DEX integration tests"
  ./run src/examples/zkapps/dex/run.ts --bundle
  ./run src/examples/zkapps/dex/upgradability.ts --bundle
  ;;

"DEX integration test with proofs")
  echo "Running DEX integration test with proofs"
  ./run src/examples/zkapps/dex/happy-path-with-proofs.ts --bundle
  ;;

"Verification Key Regression Check 1")
  echo "Running Regression checks part 1"
  VK_TEST=1 ./run ./tests/vk-regression/vk-regression.ts --bundle
  ;;

"Verification Key Regression Check 2")
  echo "Running Regression checks part 2"
  VK_TEST=2 ./run ./tests/vk-regression/vk-regression.ts --bundle
  ;;
  
"CommonJS test")
  echo "Testing CommonJS version"
  node src/examples/commonjs.cjs
  ;;

*)
  echo "ERROR: Invalid environment variable, not clear what tests to run! $CI_NODE_INDEX"
  exit 1
  ;;
esac
