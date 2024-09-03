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
                ./src/bindings/ocaml/js/dune
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
      in {
        formatter = pkgs.nixfmt;
        inherit mina;
        devShells = {
          # This seems to work better for macos
          mina-shell = inputs.mina.devShells."${system}".with-lsp;
          default = pkgs.mkShell {
            shellHook =
            ''
            RUSTUP_HOME=$(pwd)/.rustup
            export RUSTUP_HOME
            rustup toolchain link nix ${rust-channel}
            '';
            packages = with pkgs;
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
                    if [ "$1" = run ] && [ "$2" = nightly-2023-09-01 ]
                    then
                      ${rustup}/bin/rustup run nix "''${@:3}"
                    else
                      ${rustup}/bin/rustup "$@"
                    fi
                    '';
                  }
                )
                rustup
                wasm-pack
                binaryen # provides wasm-opt

                dune_3
                ocamlPackages.js_of_ocaml-ppx
                ocamlPackages.base
              ] ++ commonOverrides.buildInputs ;
          };
        };
        # TODO build from ./ocaml root, not ./. (after fixing a bug in dune-nix)
        packages = {
          kim = pkgs.kimchi-rust-wasm;
          inherit dune-description;
          bindings = prj.pkgs.o1js_bindings;
          ocaml-js = prj.pkgs.__ocaml-js__;
          default = pkgs.buildNpmPackage
            { name = "o1js";
              src = ./.;
              npmDepsHash = "sha256-++MTGDUVBccYN8LA2Xb0FkbrZ14ZyVCrDPESXa52AwQ=";
              # TODO ideally re-build bindings here
            };
        };
      });
}
