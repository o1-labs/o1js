npm run build:test
for f in ./dist/test/**/*.unit-test.js; do
  echo "Running $f"
  node $f || exit 1;
done
