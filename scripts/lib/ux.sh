#!/usr/bin/env bash
# Shared UX helpers for o1js build scripts
# Usage: source scripts/lib/ux.sh

# Color and formatting functions
bold()   { printf "\033[1m%s\033[0m\n" "$*"; }
info()   { printf "• %s\n" "$*"; }
warn()   { printf "\033[33m⚠ %s\033[0m\n" "$*"; }
error()  { printf "\033[31m✖ %s\033[0m\n" "$*"; }
ok()     { printf "\033[32m✔ %s\033[0m\n" "$*"; }

# Set up error handling with consistent messaging
setup_error_handling() {
    local script_name="${1:-script}"
    trap "error \"${script_name} failed (command: \${BASH_COMMAND})\"; exit 1" ERR
}

# Get the repository root directory relative to any script location
get_repo_root() {
    # Find the directory containing package.json (which should be repo root)
    local current_dir="$(cd "$(dirname "${BASH_SOURCE[1]}")" && pwd)"
    while [[ "$current_dir" != "/" ]]; do
        if [[ -f "$current_dir/package.json" ]]; then
            echo "$current_dir"
            return 0
        fi
        current_dir="$(dirname "$current_dir")"
    done
    error "Could not find repository root (no package.json found)"
    exit 1
}