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

# read VERBOSE_OUTPUT env, default 1
# 0 = quiet (only errors and success)
# 1 = normal (shows steps and progress)  
# 2 = verbose (shows commands and "called by" prefixes)
get_log_level() {
    echo "${VERBOSE_OUTPUT:-1}"
}

is_quiet() {
    [[ "$(get_log_level)" == "0" ]]
}

is_normal() {
    [[ "$(get_log_level)" == "1" ]]
}

is_verbose() {
    [[ "$(get_log_level)" == "2" ]]
}

should_show_steps() {
    [[ "$(get_log_level)" -ge "1" ]]
}

should_show_commands() {
    [[ "$(get_log_level)" -ge "2" ]]
}

# Color and formatting functions
bold()   { 
    if should_show_steps; then
        printf "\033[1m%s%s\033[0m\n" "$SCRIPT_PREFIX" "$*"
    fi
}
info()   { 
    if should_show_steps; then
        printf "%s• %s\n" "$SCRIPT_PREFIX" "$*"
    fi
}
warn()   { 
    if should_show_steps; then
        printf "\033[33m%s⚠ %s\033[0m\n" "$SCRIPT_PREFIX" "$*"
    fi
}
error()  { 
    # always show errors
    printf "\033[31m%s✖ %s\033[0m\n" "$SCRIPT_PREFIX" "$*"
}
ok()     { 
    if should_show_steps; then
        printf "\033[32m%s✔ %s\033[0m\n" "$SCRIPT_PREFIX" "$*"
    fi
}
success() { 
    # always show success messages
    printf "\033[1;32m%s%s\033[0m\n" "$SCRIPT_PREFIX" "$*"
}

# runs a command with a prefixed output
run_with_prefix() {
    if should_show_commands; then
        "$@" 2>&1 | while IFS= read -r line; do
            printf "%s%s\n" "$SCRIPT_PREFIX" "$line"
        done
        return "${PIPESTATUS[0]}"
    else
        # in quiet/normal mode, only show on error
        local output
        if ! output=$("$@" 2>&1); then
            printf "\033[31m%s✖ Command failed: %s\033[0m\n" "$SCRIPT_PREFIX" "$*"
            printf "%s\n" "$output"
            return 1
        fi
        return 0
    fi
}

# run a command with a prefix
run_cmd() {
    if should_show_commands; then
        printf "\033[90m%s$ %s\033[0m\n" "$SCRIPT_PREFIX" "$*"
        "$@" 2>&1 | while IFS= read -r line; do
            printf "%s\033[90m[called by %s]\033[0m %s\n" "$SCRIPT_PREFIX" "$*" "$line"
        done
        return "${PIPESTATUS[0]}"
    else
        "$@"
    fi
}

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