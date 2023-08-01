#!/bin/bash
set -e

case $TEST_TYPE in
"Simple integration tests")
  echo "Running basic integration tests"
  ./run src/examples/zkapps/hello_world/run.ts --bundle
  ./run src/examples/simple_zkapp.ts --bundle
  ./run src/examples/zkapps/reducer/reducer_composite.ts --bundle
  ./run src/examples/zkapps/composability.ts --bundle
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

"Live integration tests")
  echo "Running integration tests against real Mina network"
  ./run src/examples/zkapps/hello_world/run_live.ts --bundle
  ;;

"Unit tests")
  echo "Running unit tests"
  cd src/mina-signer
  npm run build
  cd ../..
  npm run test:unit
  npm run test
  ;;

"Verification Key Regression Check")
  echo "Running Regression checks"
  ./run ./src/examples/vk_regression.ts --bundle
  ;;

"CommonJS test")
  echo "Testing CommonJS version"
  node src/examples/commonjs.cjs
  ;;

*)
  echo "ERROR: Invalid enviroment variable, not clear what tests to run! $CI_NODE_INDEX"
  exit 1
  ;;
esac
