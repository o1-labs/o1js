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

# read VERBOSE_OUTPUT env, default true
is_verbose() {
    [[ "${VERBOSE_OUTPUT:-1}" == "1" ]]
}

# Color and formatting functions
bold()   { 
    if is_verbose; then
        printf "\033[1m%s%s\033[0m\n" "$SCRIPT_PREFIX" "$*"
    fi
}
info()   { 
    if is_verbose; then
        printf "%s• %s\n" "$SCRIPT_PREFIX" "$*"
    fi
}
warn()   { 
    if is_verbose; then
        printf "\033[33m%s⚠ %s\033[0m\n" "$SCRIPT_PREFIX" "$*"
    fi
}
error()  { 
    # always show errorss
    printf "\033[31m%s✖ %s\033[0m\n" "$SCRIPT_PREFIX" "$*"
}
ok()     { 
    if is_verbose; then
        printf "\033[32m%s✔ %s\033[0m\n" "$SCRIPT_PREFIX" "$*"
    fi
}
success() { 
    # always show success messages
    printf "\033[1;32m%s%s\033[0m\n" "$SCRIPT_PREFIX" "$*"
}

# Run a command with prefixed output
run_with_prefix() {
    if is_verbose; then
        "$@" 2>&1 | while IFS= read -r line; do
            printf "%s%s\n" "$SCRIPT_PREFIX" "$line"
        done
        return "${PIPESTATUS[0]}"
    else
        # in non verbose mode, only show on error WIP
        local output
        if ! output=$("$@" 2>&1); then
            printf "\033[31m%s✖ Command failed: %s\033[0m\n" "$SCRIPT_PREFIX" "$*"
            printf "%s\n" "$output"
            return 1
        fi
        return 0
    fi
}

# Run a command quietly (no prefix, for tools that produce too much noise)
run_quiet() {
    "$@"
}

# run a command with a prefix (only in verbose mode)
run_cmd() {
    if is_verbose; then
        printf "\033[90m%s$ %s\033[0m\n" "$SCRIPT_PREFIX" "$*"
    fi
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