#!/usr/bin/env bash
set -Eeuo pipefail

source ./scripts/lib/ux.sh

JSOO_PATH=./src/bindings/ocaml/jsoo_exports/
BUILT_PATH=./_build/default/$JSOO_PATH
BINDINGS_PATH=./src/bindings/compiled/web_bindings/

setup_script "jsoo-build-web" "JSOO build web"

mkdir -p $BINDINGS_PATH

info "building JSOO artifacts for web..."
TARGETS=(\
  o1js_web.bc.js\
)
dune build ${TARGETS[@]/#/$JSOO_PATH/}
ok "initial artifacts built successfully!"

info "copying artifacts into the right place..."
for target in ${TARGETS[@]}; do
  cp $BUILT_PATH/$target $BINDINGS_PATH/$target
  chmod 660 $BINDINGS_PATH/$target
done

info "improving error messages in web bindings..."
# Transform OCaml-style exceptions to JavaScript Error objects
run_cmd sed -i 's/function failwith(s){throw \[0,Failure,s\]/function failwith(s){throw globalThis.Error(s.c)/' $BINDINGS_PATH/o1js_web.bc.js
run_cmd sed -i 's/function invalid_arg(s){throw \[0,Invalid_argument,s\]/function invalid_arg(s){throw globalThis.Error(s.c)/' $BINDINGS_PATH/o1js_web.bc.js
run_cmd sed -i 's/return \[0,Exn,t\]/return globalThis.Error(t.c)/' $BINDINGS_PATH/o1js_web.bc.js
run_cmd sed -i 's/function raise(t){throw caml_call1(to_exn$0,t)}/function raise(t){throw Error(t?.[1]?.c ?? "Unknown error thrown by raise")}/' $BINDINGS_PATH/o1js_web.bc.js
ok "error messages improved"

info "minifying JS with esbuild..."
run_cmd npx esbuild --minify --log-level=error $BINDINGS_PATH/o1js_web.bc.js > $BINDINGS_PATH/o1js_web.bc.min.js
run_cmd mv $BINDINGS_PATH/o1js_web.bc.min.js $BINDINGS_PATH/o1js_web.bc.js
ok "JS minified"

success "JSOO artifacts built for web"