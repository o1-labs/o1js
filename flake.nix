{
  description = "o1js - TypeScript framework for zk-SNARKs and zkApps";
  inputs = {
    nixpkgs-mina.url = "github:nixos/nixpkgs/nixos-24.11-small";
    mina.url = "git+file:src/mina?submodules=1";
    nixpkgs-mozilla.url = "github:mozilla/nixpkgs-mozilla";
    nixpkgs-mozilla.flake = false;
    describe-dune.url = "github:o1-labs/describe-dune";
    describe-dune.inputs.nixpkgs.follows = "nixpkgs-mina";
    describe-dune.inputs.flake-utils.follows = "flake-utils";
    dune-nix.url = "github:o1-labs/dune-nix";
    dune-nix.inputs.nixpkgs.follows = "nixpkgs-mina";
    dune-nix.inputs.flake-utils.follows = "flake-utils";
    flake-utils.url = "github:numtide/flake-utils";
  };
  nixConfig = {
    auto-optimize-store = true;
    max-jobs = "auto";
    # taken from flake.nix in mina
    allow-import-from-derivation = "true";
    extra-substituters =
      [ "https://storage.googleapis.com/mina-nix-cache"
      ];
    extra-trusted-public-keys =
      [ "mina-nix-cache-1:djtioLfv2oxuK2lqPUgmZbf8bY8sK/BnYZCU2iU5Q10="
        "nix-cache.minaprotocol.org:fdcuDzmnM0Kbf7yU4yywBuUEJWClySc1WIF6t6Mm8h4="
        "nix-cache.minaprotocol.org:D3B1W+V7ND1Fmfii8EhbAbF1JXoe2Ct4N34OKChwk2c="
      ];
  };
  outputs = { self, nixpkgs-mina, flake-utils, ... }@inputs:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = ((nixpkgs-mina.legacyPackages."${system}".extend
          (import inputs.nixpkgs-mozilla)).extend
          inputs.mina.overlays.rust).extend
          (final: prev: { inherit (nixpkgs-mina.legacyPackages."${system}")
            nodePackages nodejs; });
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
        allOcamlDeps_ = pkgs.lib.concatMap
          (duneSpec:
            pkgs.lib.concatMap (unitSpec: unitSpec.deps or [ ])
              (duneSpec.units or [ ]))
          desc;
        allOcamlDeps =
          builtins.map (d: builtins.head (pkgs.lib.splitString "." d))
            allOcamlDeps_;
        mina = inputs.mina.packages."${system}";
        minaDeps_ =
          builtins.intersectAttrs (pkgs.lib.genAttrs allOcamlDeps (_: { }))
            mina.info.raw.deps.units;
        minaDeps = builtins.attrNames (builtins.foldl'
          (acc: pkg: acc // dune-nix.deps.packageDeps minaDeps_ "pkgs" pkg)
          minaDeps_
          (builtins.attrNames minaDeps_));
        commonOverrides = {
          DUNE_PROFILE = "dev";
          buildInputs = [ mina.base-libs ] ++ mina.external-libs
            ++ pkgs.lib.attrVals minaDeps mina.pkgs;
        };
        info = dune-nix.info desc;
        allDeps = dune-nix.allDeps info;
        noTestSkipping = _: false;
        prj_ = dune-nix.outputs' commonOverrides
          (pkgs.lib.fileset.toSource {
            root = ./src/bindings;
            fileset = ./src/bindings/ocaml;
          })
          allDeps
          info
          noTestSkipping
          prj;
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
            {
              channel = "nightly";
              date = "2024-06-13";
              sha256 = "sha256-s5nlYcYG9EuO2HK2BU3PkI928DZBKCTJ4U9bz3RX1t4=";
            }).rust.override
            {
              targets = [
                "wasm32-unknown-unknown"
                "x86_64-unknown-linux-gnu"
                "aarch64-apple-darwin"
                "x86_64-apple-darwin"
              ];
              extensions = [ "rust-src" ];
            });
        rust-channel' = rust-channel // {
          # Ensure compatibility with nixpkgs >= 24.11
          targetPlatforms = pkgs.lib.platforms.all;
          badTargetPlatforms = [ ];
        };
        rust-platform = pkgs.makeRustPlatform {
            cargo = rust-channel';
            rustc = rust-channel';
          };
        bindings-pkgs = with pkgs;
          [
            nodejs
            nodePackages.npm
            #nodePackages.prettier
            typescript
            nodePackages.typescript-language-server
            rustup
            wasm-pack
            binaryen # provides wasm-opt
            dune_3
          ] ++ commonOverrides.buildInputs;

        inherit (pkgs) lib;
        # All the submodules required by .gitmodules
        submodules = map builtins.head (builtins.filter lib.isList
          (map (builtins.match "	path = (.*)")
            (lib.splitString "\n" (builtins.readFile ./.gitmodules))));

        # Warn about missing submodules
        requireSubmodules =
          let
            ref = r: "[34;1m${r}[31;1m";
            command = c: "[37;1m${c}[31;1m";
          in
          lib.warnIf
            (
              !builtins.all (x: x)
                (map (x: builtins.pathExists ./${x} && builtins.readDir ./${x} != { })
                  submodules)
            ) ''
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
          {
            name = "o1js";
            src = with pkgs.lib.fileset;
              (toSource {
                root = ./.;
                fileset = unions [
                  ./package.json
                  ./package-lock.json
                ];
              });
            # If you get ERROR: npmDepsHash is out of date
            # you can update the hash with `nix run o1js#update-npm-deps`.
            # Failing that you can remove the hash from ./npmDepsHash and try again
            # which should get an error message with the correct hash
            # You can also just push and CI should suggest a fix which updates the hash
            npmDepsHash = builtins.readFile ./npmDepsHash;
            dontNpmBuild = true;
            installPhase = ''
              runHook preInstall
              mkdir -p $out/lib
              cp -r node_modules $out/lib
              runHook postInstall
            '';
          };

        #Rustup doesn't allow local toolchains to contain 'nightly' in the name
        #so the toolchain is linked with the name nix and rustup is wrapped in a shellscript
        #which calls the nix toolchain instead of the nightly one
        rustupWrapper = with pkgs; writeShellApplication
          {
            name = "rustup";
            #Skip check on darwin because shellcheck doesn't build
            checkPhase = if pkgs.stdenv.isDarwin then "" else null;
            text =
              ''
                if [ "$1" = run ] && { [ "$2" = nightly-2024-06-13 ] || [[ "$2" =~ 1.79-x86_64* ]]; }
                then
                  echo using nix toolchain
                  ${rustup}/bin/rustup run nix "''${@:3}"
                else
                  echo using plain rustup "$@"
                  ${rustup}/bin/rustup "$@"
                fi
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
          CARGO_TARGET_DIR = "./target";
          cargoLock = { lockFile = ./src/mina/src/lib/crypto/proof-systems/Cargo.lock; };
        };
        bindings = requireSubmodules (pkgs.stdenv.mkDerivation {
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
                ./src/bindings/mina-transaction/gen/v1/dune
                ./src/bindings/mina-transaction/gen/v2/dune
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
                ./src/bindings.d.ts
              ];
            });
          inherit (inputs.mina.devShells."${system}".default)
            PLONK_WASM_NODEJS
            PLONK_WASM_WEB
            KIMCHI_STUBS
            KIMCHI_STUBS_STATIC_LIB
            ;
          PREBUILT_KIMCHI_BINDINGS_JS_WEB =
            "${mina.files.src-lib-crypto-kimchi_bindings-js-web}/src/lib/crypto/kimchi_bindings/js/web";
          PREBUILT_KIMCHI_BINDINGS_JS_NODE_JS =
            "${mina.files.src-lib-crypto-kimchi_bindings-js-node_js}/src/lib/crypto/kimchi_bindings/js/node_js";
          EXPORT_TEST_VECTORS = "${test-vectors}/bin/export_test_vectors";
          SKIP_MINA_COMMIT = true;
          JUST_BINDINGS = true;
          buildInputs = (with pkgs;
            [
              rustupWrapper
              bash
              # Needed to use correct version of dune
              mina.base-libs
            ]) ++ bindings-pkgs;
          patchPhase = ''
            patchShebangs ./src/bindings/scripts/
            patchShebangs ./src/bindings/crypto/test-vectors/
          '';
          buildPhase =
            ''
              RUSTUP_HOME=$(pwd)/.rustup
              export RUSTUP_HOME
              rustup toolchain link nix ${rust-channel'}
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
        });
      in
      {
        formatter = pkgs.nixfmt;
        inherit mina;
        devShells = {
          # This seems to work better for macos
          mina-shell = requireSubmodules inputs.mina.devShells."${system}".with-lsp;
          default = requireSubmodules (pkgs.mkShell
            (if pkgs.stdenv.isDarwin
            # on macos use plain rustup
            then { packages = bindings-pkgs; }
            # on linux wrap rustup like in the derivation
            else {
              packages = [ rustupWrapper ] ++ bindings-pkgs;
              shellHook = ''
                RUSTUP_HOME=$(pwd)/.rustup
                export RUSTUP_HOME
                rustup toolchain link nix ${rust-channel'}
              '';
            }));


        };
        # TODO build from ./ocaml root, not ./. (after fixing a bug in dune-nix)
        packages = {
          inherit dune-description bindings;
          bindings-tar = pkgs.stdenv.mkDerivation {
            name = "bindings.tar.gz";
            src = bindings;
            buildCommand = ''
                cp -R $src/* .
                rm env-vars
                #restore write permissions removed by nix store
                chmod +w -R .
                tar czf $out .
            '';
          };
          npm-deps = o1js-npm-deps;
        };
        apps = {
          update-npm-deps = {
            type = "app";
            program = "${pkgs.writeShellApplication
              { name = "update-npm-deps";
                text =
                ''
                ${pkgs.prefetch-npm-deps}/bin/prefetch-npm-deps ./package-lock.json > npmDepsHash
                '';
              }}/bin/update-npm-deps";
          };
          generate-bindings = {
            type = "app";
            program = "${pkgs.writeShellApplication
              { name = "update-bindings";
                #Skip check on darwin because shellcheck doesn't build
                checkPhase = if pkgs.stdenv.isDarwin then "" else null;
                text =
                ''
                cp -r ${bindings}/* ./src/bindings
                chmod +w -R src/bindings/compiled
                '';
              }}/bin/update-bindings";
          };
        };
      });
}
