#!/usr/bin/env bash
set -e

./run src/examples/zkapps/hello_world/run.ts --bundle
./run src/examples/zkapps/voting/run.ts --bundle
./run src/examples/simple_zkapp.ts --bundle
./run src/examples/zkapps/reducer/reducer_composite.ts --bundle
./run src/examples/zkapps/composability.ts --bundle
./run src/examples/zkapps/dex/run.ts --bundle
./run src/examples/zkapps/dex/happy-path-with-actions.ts --bundle
./run src/examples/zkapps/dex/upgradability.ts --bundle
