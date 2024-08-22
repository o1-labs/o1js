#!/usr/bin/env bash
# Set up flake registry to get o1js with all the submodules

# Find the root of the o1js repo
ROOT=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
# Update the submodules
pushd "$ROOT" && git submodule sync && git submodule update --init --recursive && popd
# Add the flake registry entry
nix registry add o1js "git+file://$ROOT?submodules=1"
