npm run build:test
for f in ./dist/node/**/*.unit-test.js; do
  echo "Running $f"
  node $f || exit 1;
done
