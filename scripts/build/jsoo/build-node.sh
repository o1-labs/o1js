#!/usr/bin/env bash

set -Eeuo pipefail

source ./scripts/lib/ux.sh

JSOO_PATH=./src/bindings/ocaml/jsoo_exports/
BUILT_PATH=./_build/default/$JSOO_PATH
BINDINGS_PATH=./src/bindings/compiled/node_bindings/

setup_script "jsoo-build-node" "JSOO build node"

mkdir -p $BINDINGS_PATH

info "building JSOO artifacts for node..."
TARGETS=(\
  o1js_node.bc.js \
)
dune build ${TARGETS[@]/#/$JSOO_PATH/}
ok "JSOO artifacts built successfully"

info "copying artifacts into the right place..."
for target in ${TARGETS[@]}; do
  cp $BUILT_PATH/$target $BINDINGS_PATH/$target
  chmod 660 $BINDINGS_PATH/$target 
done

info "setting up TS declaration files..."
echo '// this file intentionally left blank' > $BINDINGS_PATH/o1js_node.bc.d.cts
ok "TS declaration created"

info "moving some files to CommonJS format..."
run_cmd mv -f $BINDINGS_PATH/o1js_node.bc.js $BINDINGS_PATH/o1js_node.bc.cjs
ok "Node.js bindings copied"

info "Updating WASM references in bindings..."
run_cmd sed -i 's/kimchi_wasm.js/kimchi_wasm.cjs/' $BINDINGS_PATH/o1js_node.bc.cjs
ok "WASM references updated"

info "fixing JS bindings for better error handling..."
run_cmd sed -i 's/function failwith(s){throw \[0,Failure,s\]/function failwith(s){throw globalThis.Error(s.c)/' "${BINDINGS_PATH}"/o1js_node.bc.cjs
run_cmd sed -i 's/function invalid_arg(s){throw \[0,Invalid_argument,s\]/function invalid_arg(s){throw globalThis.Error(s.c)/' "${BINDINGS_PATH}"/o1js_node.bc.cjs
run_cmd sed -i 's/return \[0,Exn,t\]/return globalThis.Error(t.c)/' "${BINDINGS_PATH}"/o1js_node.bc.cjs
run_cmd sed -i 's/function raise(t){throw caml_call1(to_exn$0,t)}/function raise(t){throw Error(t?.[1]?.c ?? "Unknown error thrown by raise")}/' "${BINDINGS_PATH}"/o1js_node.bc.cjs
ok "JS bindings fixed"

success "JSOO node build complete!"