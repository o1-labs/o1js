npm run build:test
for f in ./dist/test/**/*.unit-test.js; do
  echo "Running $f"
  node $f || (echo 'tests failed' && exit 1);
done
