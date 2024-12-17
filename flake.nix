{
  description = "o1js - TypeScript framework for zk-SNARKs and zkApps";
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-23.11-small";
    mina.url = "path:src/mina";
    nixpkgs-mozilla.url = "github:mozilla/nixpkgs-mozilla";
    nixpkgs-mozilla.flake = false;
    describe-dune.url = "github:o1-labs/describe-dune";
    describe-dune.inputs.nixpkgs.follows = "nixpkgs";
    describe-dune.inputs.flake-utils.follows = "flake-utils";
    dune-nix.url = "github:o1-labs/dune-nix";
    dune-nix.inputs.nixpkgs.follows = "nixpkgs";
    dune-nix.inputs.flake-utils.follows = "flake-utils";
    flake-utils.url = "github:numtide/flake-utils";
  };
  outputs = { self, nixpkgs, flake-utils, ... }@inputs:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs= (nixpkgs.legacyPackages."${system}".extend
          (import inputs.nixpkgs-mozilla)
          ).extend inputs.mina.overlays.rust;
        dune-nix = inputs.dune-nix.lib.${system};
        describe-dune = inputs.describe-dune.defaultPackage.${system};
        dune-description = pkgs.stdenv.mkDerivation {
          pname = "dune-description";
          version = "dev";
          src = with pkgs.lib.fileset;
            (toSource {
              root = ./src/bindings;
              fileset = unions [
                ./src/bindings/ocaml/dune
                ./src/bindings/ocaml/lib/dune
                ./src/bindings/ocaml/dune-project
                ./src/bindings/ocaml/jsoo_exports/dune
              ];
            });
          phases = [ "unpackPhase" "buildPhase" ];
          buildPhase = ''
            ${describe-dune}/bin/describe-dune > $out
          '';
        };
        desc = builtins.fromJSON (builtins.readFile dune-description);
        allOcamlDeps_ = pkgs.lib.concatMap (duneSpec:
          pkgs.lib.concatMap (unitSpec: unitSpec.deps or [ ])
          (duneSpec.units or [ ])) desc;
        allOcamlDeps =
          builtins.map (d: builtins.head (pkgs.lib.splitString "." d))
          allOcamlDeps_;
        mina = inputs.mina.packages."${system}";
        minaDeps_ =
          builtins.intersectAttrs (pkgs.lib.genAttrs allOcamlDeps (_: { }))
          mina.info.raw.deps.units;
        minaDeps = builtins.attrNames (builtins.foldl'
          (acc: pkg: acc // dune-nix.deps.packageDeps minaDeps_ "pkgs" pkg)
          minaDeps_ (builtins.attrNames minaDeps_));
        commonOverrides = {
          DUNE_PROFILE = "dev";
          buildInputs = [ mina.base-libs ] ++ mina.external-libs
            ++ pkgs.lib.attrVals minaDeps mina.pkgs;
        };
        info = dune-nix.info desc;
        allDeps = dune-nix.allDeps info;
        noTestSkipping = _: false;
        prj_ = dune-nix.outputs' commonOverrides (pkgs.lib.fileset.toSource {
          root = ./src/bindings;
          fileset = ./src/bindings/ocaml;
        }) allDeps info noTestSkipping prj;
        prj = prj_ // {
          pkgs = prj_.pkgs // {
            __ocaml-js__ = prj_.pkgs.__ocaml-js__.overrideAttrs {
              PREBUILT_KIMCHI_BINDINGS_JS_WEB =
                "${mina.files.src-lib-crypto-kimchi_bindings-js-web}/src/lib/crypto/kimchi_bindings/js/web";
              PREBUILT_KIMCHI_BINDINGS_JS_NODE_JS =
                "${mina.files.src-lib-crypto-kimchi_bindings-js-node_js}/src/lib/crypto/kimchi_bindings/js/node_js";
            };
          };
        };
        rust-channel =
          ((pkgs.rustChannelOf
            { channel = "nightly";
              date = "2023-09-01";
              sha256 = "sha256-zek9JAnRaoX8V0U2Y5ssXVe9tvoQ0ERGXfUCUGYdrMA=";
            }).rust.override
          { targets = ["wasm32-unknown-unknown" "x86_64-unknown-linux-gnu" ];
            extensions = [ "rust-src" ];
          });
        rust-platform = pkgs.makeRustPlatform
            { cargo = rust-channel;
              rustc = rust-channel;
            };

        bindings-pkgs = with pkgs;
            [ nodejs
              nodePackages.npm
              typescript
              nodePackages.typescript-language-server

              #Rustup doesn't allow local toolchains to contain 'nightly' in the name
              #so the toolchain is linked with the name nix and rustup is wrapped in a shellscript
              #which calls the nix toolchain instead of the nightly one
              (writeShellApplication
                { name = "rustup";
                  text =
                  ''
                  if [ "$1" = run ] && { [ "$2" = nightly-2023-09-01 ] || [ "$2" = 1.72-x86_64-unknowl-linux-gnu ]; }
                  then
                    echo using nix toolchain
                    ${rustup}/bin/rustup run nix "''${@:3}"
                  else
                    echo using plain rustup "$@"
                    ${rustup}/bin/rustup "$@"
                  fi
                  '';
                }
              )
              rustup
              wasm-pack
              binaryen # provides wasm-opt

              dune_3
            ] ++ commonOverrides.buildInputs ;

        inherit (nixpkgs) lib;
        # All the submodules required by .gitmodules
        submodules = map builtins.head (builtins.filter lib.isList
          (map (builtins.match "	path = (.*)")
            (lib.splitString "\n" (builtins.readFile ./.gitmodules))));

        # Warn about missing submodules
        requireSubmodules = let
          ref = r: "[34;1m${r}[31;1m";
          command = c: "[37;1m${c}[31;1m";
        in lib.warnIf (!builtins.all (x: x)
          (map (x: builtins.pathExists ./${x} && builtins.readDir ./${x} != { })
            submodules)) ''
              Some submodules are missing, you may get errors. Consider one of the following:
              - run ${command "./pin.sh"} and use "${
                ref "o1js"
              }" flake ref, e.g. ${command "nix develop o1js"} or ${
                command "nix build o1js"
              };
              - use "${ref "git+file://$PWD?submodules=1"}";
              - use "${
                ref "git+https://github.com/o1-labs/o1js?submodules=1"
              }";
              - use non-flake commands like ${command "nix-build"} and ${
                command "nix-shell"
              }.
            '';

          o1js-npm-deps = pkgs.buildNpmPackage
            { name = "o1js";
              src = with pkgs.lib.fileset;
                  (toSource {
                    root = ./.;
                    fileset = unions [
                      ./package.json
                      ./package-lock.json
                    ];
                  });
              # If you see 'ERROR: npmDepsHash is out of date' in ci
              # set this to blank run ``nix build o1js#o1js-bindings`
              # If you don't want to install nix you can also set it to "" and run ci to get the new hash
              # You should get an output like this:

              # error: hash mismatch in fixed-output derivation '/nix/store/a03cg2az0b2cvjsp1wnr89clf31i79c1-o1js-npm-deps.drv':
              # specified: sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
              #    got:    sha256-8EPvXpOgn0nvm/pFKN3h6EMjabOeBqfy5optIfe8E8Q=
              # replace npmDepsHash bellow with the new hash

              npmDepsHash = "sha256-QLnSfX6JwYQXyHGNSxXdzqbhkbFl67sDrmlW/F6D/pw=";
              # The prepack script runs the build script, which we'd rather do in the build phase.
              npmPackFlags = [ "--ignore-scripts" ];
              dontNpmBuild = true;
              installPhase = ''
                runHook preInstall

                mkdir -p $out/lib
                cp -r node_modules $out/lib

                runHook postInstall
              '';
            };
          test-vectors = rust-platform.buildRustPackage {
            src = pkgs.lib.sourceByRegex ./src/mina/src
              [
                "^lib(/crypto(/proof-systems(/.*)?)?)?$"
              ];
            sourceRoot = "source/lib/crypto/proof-systems/poseidon/export_test_vectors";
            patchPhase =
            ''
            cp ${./src/mina/src/lib/crypto/proof-systems/Cargo.lock} .
            '';
            name = "export_test_vectors";
            version = "0.1.0";
            cargoSha256 = "";
            CARGO_TARGET_DIR = "./target";
            cargoLock = { lockFile = ./src/mina/src/lib/crypto/proof-systems/Cargo.lock ; };
          };
      in {
        formatter = pkgs.nixfmt;
        inherit mina;
        devShells = {
          # This seems to work better for macos
          mina-shell = requireSubmodules inputs.mina.devShells."${system}".with-lsp;
          default = requireSubmodules (pkgs.mkShell {
            shellHook =
            ''
            RUSTUP_HOME=$(pwd)/.rustup
            export RUSTUP_HOME
            rustup toolchain link nix ${rust-channel}
            '';
            packages = bindings-pkgs;
          });


        };
        # TODO build from ./ocaml root, not ./. (after fixing a bug in dune-nix)
        packages = {
          inherit dune-description;
          o1js-bindings = pkgs.stdenv.mkDerivation {
            name = "o1js_bindings";
            src = with pkgs.lib.fileset;
            (toSource {
              root = ./.;
              fileset = unions [
                ./src/mina
                ./src/bindings/scripts
                ./src/bindings/js
                ./src/bindings/crypto
                ./src/bindings/lib
                ./src/bindings/mina-transaction/gen/dune
                (fileFilter (file: file.hasExt "js") ./src/bindings/mina-transaction)
                ./src/bindings/ocaml/lib
                ./src/bindings/ocaml/dune
                ./src/bindings/ocaml/dune-project
                (fileFilter (file: file.hasExt "ml") ./src/bindings/ocaml)
                ./package.json
                ./package-lock.json
                ./src/bindings/ocaml/jsoo_exports
                ./dune-project
                ./.prettierrc.cjs
                ./src/build
                ./src/snarky.d.ts
              ];
            });
            inherit (inputs.mina.devShells."${system}".default)
              PLONK_WASM_NODEJS
              PLONK_WASM_WEB
              MARLIN_PLONK_STUBS
              ;
            PREBUILT_KIMCHI_BINDINGS_JS_WEB =
              "${mina.files.src-lib-crypto-kimchi_bindings-js-web}/src/lib/crypto/kimchi_bindings/js/web";
            PREBUILT_KIMCHI_BINDINGS_JS_NODE_JS =
              "${mina.files.src-lib-crypto-kimchi_bindings-js-node_js}/src/lib/crypto/kimchi_bindings/js/node_js";
            EXPORT_TEST_VECTORS = "${test-vectors}/bin/export_test_vectors";
            buildInputs = bindings-pkgs ++ [ pkgs.bash ];
            SKIP_MINA_COMMIT = true;
            JUST_BINDINGS = true;
            patchPhase = ''
            patchShebangs ./src/bindings/scripts/
            patchShebangs ./src/bindings/crypto/test-vectors/
            '';
            buildPhase =
            ''
            RUSTUP_HOME=$(pwd)/.rustup
            export RUSTUP_HOME
            rustup toolchain link nix ${rust-channel}
            cp -r ${o1js-npm-deps}/lib/node_modules/ .

            mkdir -p src/bindings/compiled/node_bindings
            echo '// this file exists to prevent TS from type-checking `o1js_node.bc.cjs`' \
              > src/bindings/compiled/node_bindings/o1js_node.bc.d.cts

            npm run build:update-bindings

            mkdir -p $out/mina-transaction
            pushd ./src/bindings
              rm -rf ./compiled/_node_bindings
              cp -Lr ./compiled $out
              cp -Lr ./mina-transaction/gen $out/mina-transaction/
            popd
            '';
          };
          kimchi = pkgs.kimchi-rust-wasm;
          ocaml-js = prj.pkgs.__ocaml-js__;
        };
        apps = {
          update-bindings = {
            type = "app";
            program = "${pkgs.writeShellApplication
              { name = "update-bindings";
                text =
                ''
                cp -r ${self.packages."${system}".o1js-bindings}/* ./src/bindings
                chmod +w -R src/bindings/compiled
                MINA_COMMIT=$(git -C src/mina rev-parse HEAD)
                echo "The mina commit used to generate the backends for node and web is" "$MINA_COMMIT" \
                  > src/bindings/MINA_COMMIT
                '';
              }}/bin/update-bindings";
          };
        };
      });
}
