npm run build:test
# TODO: how to capture all tests with a single glob expression?
for f in ./dist/node/**/**/*.unit-test.js; do
  echo "Running $f"
  node $f || exit 1;
done
for f in ./dist/node/**/*.unit-test.js; do
  echo "Running $f"
  node $f || exit 1;
done
