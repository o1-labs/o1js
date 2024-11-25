#!/usr/bin/env bash
# Set up flake registry to get o1js with all the submodules

# Find the root of the o1js repo
ROOT=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
pushd "$ROOT"
# Update the submodules
git submodule sync && git submodule update --init --recursive
# Add the flake registry entry
nix registry add o1js "git+file://$ROOT?submodules=1"
# update mina input to local submodule
nix flake update mina --override-input mina 'path:src/mina' --flake '.?submodules=1'
nix flake update mina-rev --flake '.?submodules=1'
popd
