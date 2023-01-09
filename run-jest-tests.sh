for f in ./src/**/*.test.ts; do
  NODE_OPTIONS=--experimental-vm-modules npx jest $f || exit 1;
done
