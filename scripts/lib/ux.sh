#!/usr/bin/env bash
# Shared UX helpers for o1js build scripts
# Usage: source scripts/lib/ux.sh

# prefix for all messages, set by the script that calls this lib
SCRIPT_PREFIX=""

setup_script() {
    local script_path="$1"
    local script_name="$(basename "$script_path")"
    SCRIPT_PREFIX="[$script_name] "

    local script_name="${2:-script}"
    trap "error \"${script_name} failed (command: \${BASH_COMMAND})\"; exit 1" ERR
}

bold()   { printf "\033[1m%s%s\033[0m\n" "$SCRIPT_PREFIX" "$*"; }
info()   { printf "%s• %s\n" "$SCRIPT_PREFIX" "$*"; }
warn()   { printf "\033[33m%s⚠ %s\033[0m\n" "$SCRIPT_PREFIX" "$*"; }
error()  { printf "\033[31m%s✖ %s\033[0m\n" "$SCRIPT_PREFIX" "$*"; }
ok()     { printf "\033[32m%s✔ %s\033[0m\n" "$SCRIPT_PREFIX" "$*"; }
success() { printf "\033[1;32m%s%s\033[0m\n" "$SCRIPT_PREFIX" "$*"; }

# runs a command with a prefixed outut
run_with_prefix() {
    "$@" 2>&1 | while IFS= read -r line; do
        printf "%s%s\n" "$SCRIPT_PREFIX" "$line"
    done
    return "${PIPESTATUS[0]}"
}
