#!/usr/bin/env bash
# Shared UX helpers for o1js build scripts
# Usage: source scripts/lib/ux.sh

# Global script name variable (set by setup_script_name)
SCRIPT_PREFIX=""

# Set up script name prefix for all messages
setup_script() {
    local script_path="$1"
    local script_name="$(basename "$script_path")"
    SCRIPT_PREFIX="[$script_name] "

    local script_name="${2:-script}"
    trap "error \"${script_name} failed (command: \${BASH_COMMAND})\"; exit 1" ERR
}

# Color and formatting functions
bold()   { printf "\033[1m%s%s\033[0m\n" "$SCRIPT_PREFIX" "$*"; }
info()   { printf "%s• %s\n" "$SCRIPT_PREFIX" "$*"; }
warn()   { printf "\033[33m%s⚠ %s\033[0m\n" "$SCRIPT_PREFIX" "$*"; }
error()  { printf "\033[31m%s✖ %s\033[0m\n" "$SCRIPT_PREFIX" "$*"; }
ok()     { printf "\033[32m%s✔ %s\033[0m\n" "$SCRIPT_PREFIX" "$*"; }
success() { printf "\033[1;32m%s%s\033[0m\n" "$SCRIPT_PREFIX" "$*"; }

# Run a command with prefixed output
run_with_prefix() {
    "$@" 2>&1 | while IFS= read -r line; do
        printf "%s%s\n" "$SCRIPT_PREFIX" "$line"
    done
    return "${PIPESTATUS[0]}"
}

# Run a command quietly (no prefix, for tools that produce too much noise)
run_quiet() {
    "$@"
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