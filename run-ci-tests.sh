
case $CI_NODE_INDEX in
    0 ) 
      echo "Running basic integration tests";
      ./run src/examples/zkapps/hello_world/run.ts --bundle || exit 1
      ./run src/examples/simple_zkapp.ts || exit 1
      ./run src/examples/zkapps/reducer/reducer_composite.ts || exit 1
      ./run src/examples/zkapps/composability.ts || exit 1 ;; 
    1 )
      echo "Running voting integration tests";
      ./run src/examples/zkapps/voting/run.ts --bundle || exit 1 ;;

    2 )
      echo "Running DEX integration tests";
      ./run src/examples/zkapps/dex/run.ts --bundle || exit 1
      ./run src/examples/zkapps/dex/happy-path-with-proofs.ts --bundle || exit 1 ;;

    3 )
      echo "Running unit tests";
      npm run test:unit
      npm run test ;;

    * ) echo "ERROR: Invalid enviroment variable, not clear what tests to run! $CI_NODE_INDEX"; exit 1 ;;
esac
