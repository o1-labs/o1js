
case $TEST_TYPE in
    "Simple integration tests" ) 
      echo "Running basic integration tests";
      ./run src/examples/zkapps/hello_world/run.ts --bundle || exit 1
      ./run src/examples/simple_zkapp.ts --bundle || exit 1
      ./run src/examples/zkapps/reducer/reducer_composite.ts --bundle || exit 1
      ./run src/examples/zkapps/composability.ts --bundle || exit 1 ;; 

    "Voting integration tests" )
      echo "Running voting integration tests";
      ./run src/examples/zkapps/voting/run.ts --bundle || exit 1 ;;

    "DEX integration tests" )
      echo "Running DEX integration tests";
      ./run src/examples/zkapps/dex/run.ts --bundle || exit 1
      ./run src/examples/zkapps/dex/happy-path-with-proofs.ts --bundle || exit 1 
      ./run src/examples/zkapps/dex/upgradability.ts --bundle || exit 1 ;;

    "Berkeley Live" )
      echo "Running Berkeley Live integration tests";
      ./run src/examples/zkapps/hello_world/run_berkeley.ts --bundle || exit 1 ;;

    "Unit tests" )
      echo "Running unit tests";
      npm run test:unit || exit 1
      npm run test || exit 1
      cd src/mina-signer
      npm run build
      npm run test
      ;;

    * ) echo "ERROR: Invalid enviroment variable, not clear what tests to run! $CI_NODE_INDEX"; exit 1 ;;
esac
