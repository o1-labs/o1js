#!/usr/bin/env bash
set -o pipefail

# Function to add a prefix to each direct line of output
add_prefix() {
  local prefix=$1
  while IFS= read -r line; do
    echo "$prefix : $line"
  done
}

echo ""
echo "Running integration tests against the real Mina network."
echo ""

./run src/examples/zkapps/hello-world/run-live.ts --bundle | add_prefix "HELLO_WORLD" &
HELLO_WORLD_PROC=$!
./run src/examples/zkapps/reducer/run-live.ts --bundle | add_prefix "REDUCER" &
REDUCER_FLOW_PROC=$!
./run src/examples/zkapps/dex/run-live.ts --bundle | add_prefix "DEX" &
DEX_PROC=$!
./run src/examples/fetch-live.ts --bundle | add_prefix "FETCH" &
FETCH_PROC=$!
./run src/tests/transaction-flow.ts --bundle | add_prefix "TRANSACTION_FLOW" &
TRANSACTION_FLOW_PROC=$!

# Wait for each process and capture their exit statuses
FAILURE=0
wait $HELLO_WORLD_PROC
if [ $? -ne 0 ]; then
  echo ""
  echo "HELLO_WORLD test failed."
  echo ""
  FAILURE=1
fi
wait $DEX_PROC
if [ $? -ne 0 ]; then
  echo ""
  echo "DEX test failed."
  echo ""
  FAILURE=1
fi
wait $FETCH_PROC
if [ $? -ne 0 ]; then
  echo ""
  echo "FETCH test failed."
  echo ""
  FAILURE=1
fi
wait $TRANSACTION_FLOW_PROC
if [ $? -ne 0 ]; then
  echo ""
  echo "TRANSACTION_FLOW test failed."
  echo ""
  FAILURE=1
fi
wait $REDUCER_FLOW_PROC
if [ $? -ne 0 ]; then
  echo ""
  echo "REDUCER_FLOW test failed."
  echo ""
  FAILURE=1
fi

# Exit with failure if any process failed
if [ $FAILURE -ne 0 ]; then
  exit 1
fi

echo ""
echo "All tests completed successfully."
echo ""
