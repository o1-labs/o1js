# o1js Examples

This folder contains many examples for using o1js. Take a look around!

## Running examples

You can run most examples using Node.js from the root directory, using the `./run` script:

```
./run src/examples/some-example.ts
```

Some examples depend on other files in addition to `"o1js"`. For those examples, you need to add the `--bundle` option to bundle them before running:

```
./run src/examples/multi-file-example.ts --bundle
```

Most of the examples do not depend on Node.js specific APIs, and can also be run in a browser. To do so, use:

```
./run-in-browser.js src/examples/web-compatible-example.ts
```

After running the above, navigate to http://localhost:8000 and open your browser's developer console to see the example executing.
