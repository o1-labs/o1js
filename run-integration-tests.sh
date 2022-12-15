./run src/examples/zkapps/hello_world/run.ts --bundle || exit 1
./run src/examples/zkapps/voting/run.ts --bundle || exit 1
./run src/examples/simple_zkapp.ts || exit 1
./run src/examples/zkapps/reducer/reducer_composite.ts || exit 1
./run src/examples/zkapps/composability.ts || exit 1
./run src/examples/zkapps/dex/run.ts --bundle || exit 1
./run src/examples/zkapps/dex/happy-path-with-proofs.ts --bundle || exit 1
./run src/examples/zkapps/dex/upgradability.ts --bundle || exit 1