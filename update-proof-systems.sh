#!/usr/bin/env bash

# update-proof-systems.sh
#
# Description:
#   This script automates the workflow for updating the proof-systems dependency and
#   regenerating bindings for o1js. It performs the following tasks:
#   1. Checks for required dependencies (gh, cargo, npm, dune)
#   2. Initializes all Mina submodules
#   3. Updates the proof-systems submodule to the specified branch in Mina
#   4. Updates kimchi-stubs-vendors by running cargo vendor
#   5. Creates a commit for proof-systems update in Mina
#   6. Creates a branch and commit in the kimchi-stubs-vendors repository if needed
#   7. Updates the reference to kimchi-stubs-vendors in Mina
#   8. Updates the Mina submodule in o1js and commits the changes
#   9. Cleans build artifacts with dune clean and cargo clean
#   10. Regenerates bindings using npm run build:update-bindings
#   11. Creates a new branch and commit with updated bindings in src/bindings
#   12. Optionally creates PRs for all changes with proper cross-references
#
# Usage:
#   PROOF_SYSTEMS_BRANCH=branch_name [OPTIONS] ./update-proof-systems.sh
#
# Options:
#   MINA_TARGET_BRANCH=branch       # Target branch for Mina PR (default: compatible)
#   VENDORS_TARGET_BRANCH=branch    # Target branch for kimchi-stubs-vendors PR (default: main)
#   O1JS_TARGET_BRANCH=branch       # Target branch for o1js PR (default: main)
#   BINDINGS_TARGET_BRANCH=branch   # Target branch for o1js-bindings PR (default: main)
#   GIT_REMOTE=remote               # Git remote name to use (default: origin)
#   YES_TO_ALL=1                    # Skip all confirmation prompts (default: 0)
#
# Requirements:
#   - GitHub CLI (gh) with authentication
#   - Cargo and Rust
#   - npm
#   - OCaml with opam and dune
#   - Correct OPAM switch with all dependencies installed
#   - Clean git working directory

set -e
set -o pipefail

# Set default target branches
BINDINGS_TARGET_BRANCH="${BINDINGS_TARGET_BRANCH:-main}"
MINA_TARGET_BRANCH="${MINA_TARGET_BRANCH:-compatible}"
O1JS_TARGET_BRANCH="${O1JS_TARGET_BRANCH:-main}"
VENDORS_TARGET_BRANCH="${VENDORS_TARGET_BRANCH:-main}"

# Set default git remote name (origin is standard default)
GIT_REMOTE="${GIT_REMOTE:-origin}"

# Set confirmation behavior (YES_TO_ALL=1 to bypass all confirmations)
YES_TO_ALL="${YES_TO_ALL:-0}"

# Store the original directory for error handling
ORIGINAL_DIR="$(pwd)"

MINA_SUBMODULE_LOCATION="${ORIGINAL_DIR}"/src/mina
KIMCHI_STUBS_LOCATION="${MINA_SUBMODULE_LOCATION}"/src/lib/crypto/kimchi_bindings/stubs
KIMCHI_STUBS_VENDORS_SUBMODULE_LOCATION="${MINA_SUBMODULE_LOCATION}"/src/lib/crypto/kimchi_bindings/stubs/kimchi-stubs-vendors
O1JS_BINDINGS_SUBMODULE_LOCATION="${ORIGINAL_DIR}"/src/bindings
ORIGINAL_O1JS_HASH="$(git rev-parse HEAD)"
PROOF_SYSTEMS_SUBMODULE_LOCATION="${MINA_SUBMODULE_LOCATION}"/src/lib/crypto/proof-systems

CARGO_LOCK_CHANGED=0
MINA_CHANGED=0
O1jS_CHANGED=0
VENDORS_CHANGED=0

MINA_BRANCH_CREATED=1
O1JS_BRANCH_CREATED=1
VENDORS_BRANCH_CREATED=1

BINDINGS_BRANCH="bindings-update-${PROOF_SYSTEMS_BRANCH}"
MINA_BRANCH="mina-update-${PROOF_SYSTEMS_BRANCH}"
O1JS_BRANCH="o1js-update-${PROOF_SYSTEMS_BRANCH}"
VENDORS_BRANCH="vendors-update-${PROOF_SYSTEMS_BRANCH}"

# Error handling and cleanup
cleanup() {
  local exit_code=$?
  local cleanup_reason="error"

  # Allow cleanup to be called with a reason
  if [ -n "$1" ]; then
      cleanup_reason="$1"
      # If we're doing a normal cleanup (not error), set exit code to 0
      if [ "$cleanup_reason" != "error" ]; then
          exit_code=0
      fi
  fi

  echo "⚠️  Script cleanup initiated (reason: ${cleanup_reason})..."

  git submodule update --init --recursive --force

  # Return to the original directory
  cd "${ORIGINAL_DIR}" || true

  # Clean up temporary vendors branch
  if [ "${BINDINGS_BRANCH_CREATED}" = "1" ]; then
      cd "${BINDINGS_SUBMODULE_LOCATION}" || true
      # Check if branch exists before trying to delete it
      git checkout "${BINDINGS_TARGET_BRANCH}"
      git branch -D "${BINDINGS_BRANCH}"
      echo "✅ Temporary bindings branch ${BINDINGS_BRANCH} cleaned up."
  else
      echo "No branch has been created for bindings, skipping"
  fi

  # Clean up temporary vendors branch
  if [ "${MINA_BRANCH_CREATED}" = "1" ]; then
      cd "${MINA_SUBMODULE_LOCATION}" || true
      git checkout "${MINA_TARGET_BRANCH}"
      git branch -D "${MINA_BRANCH}"
      echo "✅ Temporary Mina branch ${MINA_BRANCH} cleaned up."
  else
      echo "No branch has been created for Mina, skipping"
  fi

  # Clean up temporary vendors branch
  if [ "${VENDORS_BRANCH_CREATED}" = "1" ]; then
    cd "${KIMCHI_STUBS_VENDORS_SUBMODULE_LOCATION}" || true
    git checkout "${VENDORS_TARGET_BRANCH}"
    git branch -D "${VENDORS_BRANCH}"
    echo "✅ Temporary vendors branch ${VENDORS_BRANCH} cleaned up."
  else
      echo "No branch has been created for vendors, skipping"
  fi

  # FIXME: reset and delete correctly
  # Reset o1js state to before the execution
  cd "${ORIGINAL_DIR}" || true
  git reset --hard "${ORIGINAL_O1JS_HASH}"
  if [ "$cleanup_reason" = "error" ]; then
    echo "Cleanup complete. Check the error message above for details."
  else
    echo "Cleanup complete."
  fi

  exit $exit_code
}

# Set up trap for error handling
trap cleanup ERR INT

# Format commit messages to strictly wrap at 80 chars
format_commit_message() {
  local title="$1"
  local body="$2"

  # Ensure title is under 80 chars
  if [ ${#title} -gt 80 ]; then
    title="${title:0:77}..."
  fi

  # Format body with proper line wrapping at exactly 80 chars
  # We use fold for proper wrapping of long paragraphs
  local formatted_body
  formatted_body=$(echo "$body" | fold -s -w 80)

  # Format script attribution to strictly maintain 80 char width
  local script_info
  script_info=$(cat <<EOF | fold -s -w 80
Created with update-proof-systems.sh script using:
- PROOF_SYSTEMS_BRANCH=${PROOF_SYSTEMS_BRANCH}
- MINA_TARGET_BRANCH=${MINA_TARGET_BRANCH}
- VENDORS_TARGET_BRANCH=${VENDORS_TARGET_BRANCH}
- O1JS_TARGET_BRANCH=${O1JS_TARGET_BRANCH}
- BINDINGS_TARGET_BRANCH=${BINDINGS_TARGET_BRANCH}
- GIT_REMOTE=${GIT_REMOTE}
EOF
)

  # Generate commit message with heredoc - properly formatted
  cat <<EOF
${title}

${formatted_body}

${script_info}
EOF
}

# Format PR titles to be shorter and well-formatted
format_pr_title() {
  local full_title="$1"

  # Keep PR titles under 80 chars
  # Return just the first 75 chars if longer
  if [ ${#full_title} -gt 75 ]; then
    echo "${full_title:0:72}..."
  else
    echo "${full_title}"
  fi
}

# Print section header
print_section() {
  echo ""
  echo "════════════════════════════════════════════════════════════════════════════════"
  echo "  $1"
  echo "════════════════════════════════════════════════════════════════════════════════"
  echo ""
}

# Check for required tools
check_requirements() {
  # Check for gh (GitHub CLI)
  if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed." >&2
    echo "Please install it from https://cli.github.com/" >&2
    exit 1
  fi

  # Check if user is authenticated with GitHub
  if ! gh auth status &> /dev/null; then
    echo "Error: Not authenticated with GitHub." >&2
    echo "Please run 'gh auth login' to authenticate." >&2
    exit 1
  fi

  # Check GitHub rate limits
  echo "Checking GitHub API rate limits..."

  # Get current rate limit information
  rate_limit_info=$(gh api rate_limit 2>/dev/null || echo '{"resources":{"core":{"remaining":0,"limit":60}}}')
  remaining=$(echo "$rate_limit_info" | grep -o '"remaining":[0-9]*' | head -1 | cut -d':' -f2)
  limit=$(echo "$rate_limit_info" | grep -o '"limit":[0-9]*' | head -1 | cut -d':' -f2)

  # We need at least 10 API calls for this script
  if [ "$remaining" -lt 10 ]; then
    echo "⚠️ WARNING: GitHub API rate limit is low: $remaining/$limit remaining." >&2
    echo "This script may fail due to rate limiting." >&2

    # Ask for confirmation to proceed
    if [ "${YES_TO_ALL}" != "1" ]; then
      read -rp "Do you want to proceed anyway? (y/n): " proceed_anyway
      if [[ "${proceed_anyway}" != "y" && "${proceed_anyway}" != "Y" ]]; then
        echo "Exiting as requested."
        exit 0
      fi
    fi
  else
    echo "✅ GitHub API rate limit is sufficient: $remaining/$limit remaining."
  fi

  # Check for cargo
  if ! command -v cargo &> /dev/null; then
    echo "Error: Cargo is not installed." >&2
    echo "Please install Rust and Cargo from https://rustup.rs/" >&2
    exit 1
  fi

  # Check for npm
  if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed." >&2
    echo "Please install Node.js and npm." >&2
    exit 1
  fi

  # Check for dune
  if ! command -v dune &> /dev/null; then
    echo "Error: dune is not installed." >&2
    echo "Please install OCaml and dune." >&2
    exit 1
  fi

  # Check for opam
  if ! command -v opam &> /dev/null; then
    echo "Error: opam is not installed." >&2
    echo "Please install OCaml's package manager (opam)." >&2
    exit 1
  fi

  # Check for the 'fold' command used for text wrapping
  if ! command -v fold &> /dev/null; then
    echo "Warning: 'fold' command not found. Commit message formatting may not work correctly." >&2
    # Not a fatal error, so just warn
  fi
}

# Confirmation helper function
confirm_step() {
  local message="$1"
  local step_name="$2"

  # Skip confirmation if YES_TO_ALL is set
  if [ "${YES_TO_ALL}" = "1" ]; then
    echo "✅ Automatically proceeding with ${step_name} (YES_TO_ALL is enabled)"
    return 0
  fi

  echo ""
  read -rp "${message} (y/n): " confirm
  if [[ "${confirm}" != "y" && "${confirm}" != "Y" ]]; then
    echo "❌ ${step_name} skipped. Cleaning up and exiting."
    # Call cleanup with 'user-abort' reason to clean up any temporary branches
    cleanup "user-abort"
    # cleanup will exit for us
  fi
  echo "✅ Proceeding with ${step_name}"
}

# Function to check if a branch exists and handle it based on user input
check_existing_branch() {
  local repo_name="$1"
  local branch_name="$2"
  local remote_name="${3:-origin}"

  if git show-ref --verify --quiet "refs/heads/${branch_name}" ||
     git show-ref --verify --quiet "refs/remotes/${remote_name}/${branch_name}"; then
    echo "⚠️  The branch '${branch_name}' already exists in ${repo_name} repository."

    # Auto-skip if YES_TO_ALL is set
    if [ "${YES_TO_ALL}" = "1" ]; then
      echo "✅ Automatically skipping branch creation and using existing branch (YES_TO_ALL is enabled)"
      git checkout "${branch_name}"
      return 1 # Return 1 to indicate branch exists and we're skipping
    fi

    read -rp "Do you want to skip creating this branch and continue with the existing one? (y/n): " skip_branch
    if [[ "${skip_branch}" != "y" && "${skip_branch}" != "Y" ]]; then
      echo "❌ Exiting as requested."
      exit 1
    fi
    echo "✅ Skipping branch creation and using existing branch."
    git checkout "${branch_name}"
    return 1 # Return 1 to indicate branch exists and we're skipping
  fi

  return 0 # Return 0 to indicate branch doesn't exist
}

# Function to check if a branch exists in a repository
branch_exists() {
  local repo_path="$1"
  local remote="$2"
  local branch="$3"

  # Save current directory
  local current_dir
  current_dir="$(pwd)"

  # Navigate to repo
  cd "${repo_path}" || return 1

  # Check if branch exists (either locally or remotely)
  if git show-ref --verify --quiet "refs/heads/${branch}" ||
     git show-ref --verify --quiet "refs/remotes/${remote}/${branch}"; then
    result=0  # Branch exists
  else
    result=1  # Branch doesn't exist
  fi

  # Return to original directory
  cd "${current_dir}" || return 1

  return ${result}
}

# Run requirements check
check_requirements

# Check if the git working directory is clean
if [[ -n "$(git status --porcelain)" ]]; then
  echo "❌ Error: Working directory has uncommitted changes." >&2
  echo "Please commit or stash your changes before running this script." >&2
  git status
  exit 1
fi

# Check if PROOF_SYSTEMS_BRANCH is provided
if [ -z "${PROOF_SYSTEMS_BRANCH}" ]; then
  echo "Error: PROOF_SYSTEMS_BRANCH environment variable is not set." >&2
  echo "Usage: PROOF_SYSTEMS_BRANCH=branch_name ./update-proof-systems.sh" >&2
  exit 1
fi

# Warning about environment
print_section "ENVIRONMENT VERIFICATION"
echo "⚠️  WARNING: This script runs commands directly in your environment, NOT through Nix."
echo "⚠️  Please verify you are in the correct OPAM switch with all dependencies installed."
echo "⚠️  Incorrect setup may result in build failures or inconsistent bindings."
echo ""
echo "🔍 Current OPAM switch:"
opam switch list | grep -F "→"
echo ""

# Display and confirm target branches
print_section "CONFIGURATION"
echo "Source branch: ${PROOF_SYSTEMS_BRANCH}"
echo ""
echo "Target branches for PRs:"
echo "- Mina: ${MINA_TARGET_BRANCH}"
echo "- Kimchi-stubs-vendors: ${VENDORS_TARGET_BRANCH}"
echo "- o1js: ${O1JS_TARGET_BRANCH}"
echo "- o1js bindings: ${BINDINGS_TARGET_BRANCH}"
echo ""
echo "Git remote: ${GIT_REMOTE}"
echo ""
echo "Script settings:"
if [ "${YES_TO_ALL}" = "1" ]; then
  echo "- Skip confirmations: ENABLED (all confirmations skipped)"
else
  echo "- Skip confirmations: DISABLED (will prompt for confirmations)"
fi
echo ""
echo "You can customize settings by setting environment variables:"
echo "- MINA_TARGET_BRANCH (default: compatible)"
echo "- VENDORS_TARGET_BRANCH (default: main)"
echo "- O1JS_TARGET_BRANCH (default: main)"
echo "- BINDINGS_TARGET_BRANCH (default: main)"
echo "- GIT_REMOTE (default: origin)"
echo "- YES_TO_ALL=1 (default: 0) - skip confirmations"
echo ""

# Verify target branches exist
print_section "BRANCH VERIFICATION"
echo "Verifying target branches..."

# Fetch from origin with prune to ensure we have latest branch information
echo "Fetching latest branch information from origin..."
git fetch origin --prune

# Check Mina target branch (always using origin for o1js)
if ! branch_exists "$(pwd)" "origin" "${MINA_TARGET_BRANCH}"; then
  echo "❌ Error: Target branch '${MINA_TARGET_BRANCH}' not found in Mina repository."
  echo "   Please create the branch or specify a different target branch with MINA_TARGET_BRANCH."
  exit 1
fi

# FIXME: add mina

# Navigate to kimchi-stubs-vendors to check its target branch
CURRENT_DIR="$(pwd)"
if cd "${KIMCHI_STUBS_VENDORS_SUBMODULE_LOCATION}" 2>/dev/null; then
  # First check if the specified remote exists in this repo
  if ! git remote | grep -q "^${GIT_REMOTE}$"; then
    echo "❌ Error: Remote '${GIT_REMOTE}' not found in kimchi-stubs-vendors repository."
    echo "   Please add the remote or specify a different remote with GIT_REMOTE."
    cd "${CURRENT_DIR}" || exit 1
    exit 1
  fi

  # Fetch from the remote with prune to ensure we have the latest branch information
  echo "Fetching latest branch information from ${GIT_REMOTE} in kimchi-stubs-vendors..."
  git fetch "${GIT_REMOTE}" --prune

  if ! branch_exists "$(pwd)" "${GIT_REMOTE}" "${VENDORS_TARGET_BRANCH}"; then
    echo "❌ Error: Target branch '${VENDORS_TARGET_BRANCH}' not found in kimchi-stubs-vendors repository."
    echo "   Please create the branch or specify a different target branch with VENDORS_TARGET_BRANCH."
    cd "${CURRENT_DIR}" || exit 1
    exit 1
  fi
  cd "${CURRENT_DIR}" || exit 1
fi

# Check if o1js bindings target branch exists (always using origin for o1js)
if ! branch_exists "$(pwd)" "origin" "${BINDINGS_TARGET_BRANCH}"; then
  echo "❌ Error: Target branch '${BINDINGS_TARGET_BRANCH}' not found in o1js repository."
  echo "   Please create the branch or specify a different target branch with BINDINGS_TARGET_BRANCH."
  exit 1
fi

# Also check if the source branch exists in proof-systems
cd "${PROOF_SYSTEMS_SUBMODULE_LOCATION}" || { echo "Failed to navigate to proof-systems directory" >&2; exit 1; }

# Check if the specified remote exists in proof-systems repo
if ! git remote | grep -q "^${GIT_REMOTE}$"; then
  echo "❌ Error: Remote '${GIT_REMOTE}' not found in proof-systems repository."
  echo "   Please add the remote or specify a different remote with GIT_REMOTE."
  exit 1
fi

# Fetch from the remote with prune to ensure we have the latest branch information
echo "Fetching latest branch information from ${GIT_REMOTE} in proof-systems..."
git fetch "${GIT_REMOTE}" --prune

if ! branch_exists "$(pwd)" "${GIT_REMOTE}" "${PROOF_SYSTEMS_BRANCH}"; then
  echo "❌ Error: Source branch '${PROOF_SYSTEMS_BRANCH}' not found in proof-systems repository."
  echo "   Please check the branch name and try again."
  exit 1
fi
cd ../../../../../.. || { echo "Failed to navigate back to root directory" >&2; exit 1; }

# Confirm initial settings
confirm_step "Do you want to proceed with these settings?" "initial setup"

print_section "STARTING UPDATE PROCESS"
echo "Starting proof-systems update process with branch: ${PROOF_SYSTEMS_BRANCH}"

# Step 1: Navigate to Mina submodule
cd "${MINA_SUBMODULE_LOCATION}" || { echo "Failed to navigate to ${MINA_SUBMODULE_LOCATION} directory" >&2; exit 1; }
MINA_DIR="$(pwd)"

# Step 2: Ensure all submodules are initialized first
git submodule update --init --recursive
echo "Initialized all submodules in Mina"

# Step 3: Checkout to the specified branch of proof-systems and update submodules
cd src/lib/crypto/proof-systems || { echo "Failed to navigate to proof-systems directory" >&2; exit 1; }
print_section "PROOF-SYSTEMS UPDATE"
echo "Ready to checkout proof-systems to branch: ${PROOF_SYSTEMS_BRANCH}"
confirm_step "Do you want to update proof-systems to this branch?" "proof-systems update"

git fetch "${GIT_REMOTE}"
git checkout "${GIT_REMOTE}"/"${PROOF_SYSTEMS_BRANCH}"
git submodule update --init --recursive
# Get the commit hash for use in commit messages
PROOF_SYSTEMS_COMMIT=$(git rev-parse HEAD)
echo "Checked out proof-systems to branch: ${PROOF_SYSTEMS_BRANCH} (commit: ${PROOF_SYSTEMS_COMMIT})"

# Set fixed repository URLs for PR creation and references
PROOF_SYSTEMS_REPO_URL="https://github.com/o1-labs/proof-systems"
MINA_REPO_URL="https://github.com/minaprotocol/mina"
VENDORS_REPO_URL="https://github.com/minaprotocol/kimchi-stubs-vendors"
O1JS_REPO_URL="https://github.com/o1-labs/o1js"
# Remove unused variable
# O1JS_BINDINGS_REPO_URL="https://github.com/o1-labs/o1js-bindings"

# Step 4: Run cargo vendor to update kimchi-stubs-vendors
cd "${KIMCHI_STUBS_LOCATION}" || { echo "Failed to navigate to stubs directory" >&2; exit 1; }
print_section "KIMCHI-STUBS-VENDORS UPDATE"
confirm_step "Do you want to update kimchi-stubs-vendors with cargo vendor?" "kimchi-stubs-vendors update"
echo "Running cargo vendor for kimchi-stubs-vendors..."
cargo vendor "${KIMCHI_STUBS_VENDORS_SUBMODULE_LOCATION}"

# Step 5: Check if there are changes in the vendors directory
cd "${KIMCHI_STUBS_VENDORS_SUBMODULE_LOCATION}" || { echo "Failed to navigate to kimchi-stubs-vendors directory" >&2; exit 1; }
VENDORS_CHANGES="$(git status --porcelain)"

# Return to the Mina root directory for commits
cd "${MINA_DIR}" || { echo "Failed to navigate back to Mina directory" >&2; exit 1; }

# Step 6: Make the first commit - updating proof-systems in ${MINA_SUBMODULE_LOCATION}
print_section "COMMIT CHANGES TO MINA"
echo "Ready to commit proof-systems update in Mina"
confirm_step "Do you want to commit the proof-systems update in Mina?" "Mina proof-systems commit"

git add src/lib/crypto/proof-systems

# Create a wrapped commit message
COMMIT_TITLE="Update proof-systems to commit ${PROOF_SYSTEMS_COMMIT:0:8}"
COMMIT_BODY="This commit updates the proof-systems submodule to commit ${PROOF_SYSTEMS_COMMIT} from the ${PROOF_SYSTEMS_BRANCH} branch."

# Use the formatting function
git commit -m "$(format_commit_message "${COMMIT_TITLE}" "${COMMIT_BODY}")"

# Step 7: If there are changes in vendors, create a separate commit in the
# kimchi-stubs-vendors repo
if [ -n "${VENDORS_CHANGES}" ]; then
  print_section "PREPARE KIMCHI-STUBS-VENDORS CHANGES"

  # Navigate to the kimchi-stubs-vendors repository
  cd "${KIMCHI_STUBS_VENDORS_SUBMODULE_LOCATION}" || { echo "Failed to navigate to kimchi-stubs-vendors directory" >&2; exit 1; }

  # Check if there are any changes to commit after adding all files
  git add .
  # Commit all changes
  echo "Ready to commit kimchi-stubs-vendors changes"
  confirm_step "Do you want to commit kimchi-stubs-vendors changes?" "kimchi-stubs-vendors commit"

  # Create a wrapped commit message
  VENDORS_COMMIT_TITLE="Update vendor deps for proof-systems commit ${PROOF_SYSTEMS_COMMIT:0:8}"
  VENDORS_COMMIT_BODY="This commit updates the vendored dependencies needed for proof-systems commit ${PROOF_SYSTEMS_COMMIT} from the ${PROOF_SYSTEMS_BRANCH} branch."

  # Use the formatting function
  git commit -m "$(format_commit_message "${VENDORS_COMMIT_TITLE}" "${VENDORS_COMMIT_BODY}")"

  # Store the commit hash for later use
  VENDORS_CHANGED=1

  # Return to the Mina directory
  cd "${MINA_DIR}" || { echo "Failed to navigate back to Mina directory" >&2; exit 1; }

  # Now also commit the reference to kimchi-stubs-vendors in Mina
  print_section "UPDATE KIMCHI-STUBS-VENDORS REFERENCE IN MINA"
  echo "Ready to commit kimchi-stubs-vendors reference update in Mina"
  confirm_step "Do you want to commit the kimchi-stubs-vendors reference update in Mina?" "kimchi-stubs-vendors reference commit"

  git add src/lib/crypto/kimchi_bindings/stubs/kimchi-stubs-vendors

  # Create a wrapped commit message
  VENDORS_REF_COMMIT_TITLE="Update kimchi-stubs-vendors ref for proof-systems commit ${PROOF_SYSTEMS_COMMIT:0:8}"
  VENDORS_REF_COMMIT_BODY="This commit updates the reference to kimchi-stubs-vendors for proof-systems commit ${PROOF_SYSTEMS_COMMIT} from the ${PROOF_SYSTEMS_BRANCH} branch."

  # Use the formatting function
  git commit -m "$(format_commit_message "${VENDORS_REF_COMMIT_TITLE}" "${VENDORS_REF_COMMIT_BODY}")"

  # FIXME: even if no vendors, the lock could be changing.

  # Check if Cargo.lock in stubs directory has been modified
  if git status --porcelain "${KIMCHI_STUBS_LOCATION}"/Cargo.lock | grep -q .; then
    echo "Detected changes to ${KIMCHI_STUBS_LOCATION}/Cargo.lock"
    echo "Ready to commit Cargo.lock changes"
    confirm_step "Do you want to commit the Cargo.lock changes?" "Cargo.lock commit"

    git add src/lib/crypto/kimchi_bindings/stubs/Cargo.lock

    # Create a wrapped commit message
    CARGO_LOCK_COMMIT_TITLE="Update Cargo.lock for proof-systems commit ${PROOF_SYSTEMS_COMMIT:0:8}"
    CARGO_LOCK_COMMIT_BODY="This commit updates the Cargo.lock file in kimchi_bindings/stubs after
running cargo vendor for proof-systems commit ${PROOF_SYSTEMS_COMMIT} from the
${PROOF_SYSTEMS_BRANCH} branch."

    # Use the formatting function
    git commit -m "$(format_commit_message "${CARGO_LOCK_COMMIT_TITLE}" "${CARGO_LOCK_COMMIT_BODY}")"

    CARGO_LOCK_CHANGED=1
  else
    echo "No changes detected to ${KIMCHI_STUBS_LOCATION}/Cargo.lock"
    CARGO_LOCK_CHANGED=0
  fi
fi

# Return to the o1js root directory
cd "${ORIGINAL_DIR}" || { echo "Failed to navigate back to o1js root directory" >&2; exit 1; }

# Step 8: Update Mina submodule in o1js
# There will always be an update as proof-systems, at least, is updated.
print_section "UPDATE MINA SUBMODULE IN O1JS"
echo "Ready to update Mina submodule in o1js"
confirm_step "Do you want to update the Mina submodule in o1js?" "Mina submodule update"

# Step 9: Create a commit in o1js updating Mina
print_section "COMMIT MINA SUBMODULE UPDATE"
echo "Ready to commit Mina submodule update in o1js"
confirm_step "Do you want to commit the Mina submodule update in o1js?" "Mina submodule commit"

cd "${ORIGINAL_DIR}"
git add "${MINA_SUBMODULE_LOCATION}"

# Create a wrapped commit message
MINA_COMMIT_TITLE="Update Mina submodule for proof-systems commit ${PROOF_SYSTEMS_COMMIT:0:8}"
MINA_COMMIT_BODY="This updates the Mina submodule which includes the changes to proof-systems
commit ${PROOF_SYSTEMS_COMMIT} from the ${PROOF_SYSTEMS_BRANCH} branch."

# Use the formatting function
git commit -m "$(format_commit_message "${MINA_COMMIT_TITLE}" "${MINA_COMMIT_BODY}")"
MINA_CHANGED=1

# Step 10: Clean before generating bindings
print_section "CLEAN BUILD ARTIFACTS"
echo "Ready to clean build artifacts"
confirm_step "Do you want to clean build artifacts (dune clean, cargo clean)?" "build artifact cleaning"

echo "Running dune clean..."
dune clean

echo "Running cargo clean in all relevant directories..."
# Find all Cargo.toml files, exclude certain directories, and run cargo clean
find . -name Cargo.toml\
  -not -path "*/target/*"\
  | grep -vE "ethereum-optimism|kimchi-stubs-vendors|snarky-deriver"\
  | xargs -I {} dirname {}\
  | sort -u\
  | xargs -I {} bash -c '
      echo "Cleaning {}"
      cd "{}" && cargo clean
    '

echo "Running npm run clean-all"
npm run clean-all

# Step 11: Run the update-bindings command
print_section "REGENERATE BINDINGS"
echo "Ready to regenerate bindings"
confirm_step "Do you want to regenerate the bindings with npm run build:update-bindings?" "bindings regeneration"

echo "Regenerating bindings with npm run build:update-bindings..."
npm run build:update-bindings

# Step 12: Create a new branch for the bindings update
print_section "PREPARE BINDINGS CHANGES"

cd "${O1JS_BINDINGS_SUBMODULE_LOCATION}"

# Step 13: Commit the updated bindings
echo "Ready to commit updated bindings"
confirm_step "Do you want to commit the updated bindings?" "bindings commit"

echo "Checking for changes in bindings..."
if git status --porcelaine | grep -q; then
  echo "No changes detected in bindings after regeneration."
  echo "Skipping commit as there are no changes to commit."
  BINDINGS_CHANGED=0
else
  echo "Committing updated bindings..."
  git add MINA_COMMIT compiled

  # Create a wrapped commit message
  BINDINGS_COMMIT_TITLE="Update o1js bindings for proof-systems commit ${PROOF_SYSTEMS_COMMIT:0:8}"
  BINDINGS_COMMIT_BODY="This updates the o1js bindings based on proof-systems commit ${PROOF_SYSTEMS_COMMIT} from the ${PROOF_SYSTEMS_BRANCH} branch."

  # Use the formatting function
  git commit -m "$(format_commit_message "${BINDINGS_COMMIT_TITLE}" "${BINDINGS_COMMIT_BODY}")"
  BINDINGS_CHANGED=1

  cd "${ORIGINAL_DIR}"
  git add src/bindings

  # Create a wrapped commit message
  BINDINGS_COMMIT_TITLE="Update o1js bindings for proof-systems commit ${PROOF_SYSTEMS_COMMIT:0:8}"
  BINDINGS_COMMIT_BODY="This updates the o1js bindings based on proof-systems commit ${PROOF_SYSTEMS_COMMIT} from the ${PROOF_SYSTEMS_BRANCH} branch."

  # Use the formatting function
  git commit -m "$(format_commit_message "${BINDINGS_COMMIT_TITLE}" "${BINDINGS_COMMIT_BODY}")"
  O1JS_CHANGED=1
fi

# Step 14: Summary of changes before branch creation
print_section "CHANGES SUMMARY"
echo "Process completed successfully!"
echo "- Proof-systems updated to branch: ${PROOF_SYSTEMS_BRANCH} (commit: ${PROOF_SYSTEMS_COMMIT})"
if [ "${VENDORS_CHANGED}" = "1" ]; then
  echo "- Kimchi-stubs-vendors changes prepared"
  echo "- Reference to kimchi-stubs-vendors updated in Mina"
  # Check if we had a Cargo.lock commit
  if [ "${CARGO_LOCK_CHANGED}" = "1" ]; then
    echo "- Cargo.lock updated and committed in Mina"
  fi
fi
echo "- Bindings submodule updated and committed in o1js"
if [ "${BINDINGS_CHANGED}" = "1" ]; then
  echo "- Bindings have been regenerated and prepared for branch: ${BINDINGS_BRANCH}"
else
  echo "- No changes detected in bindings after regeneration"
fi

# Now create and push all branches at the end, when everything has succeeded
print_section "BRANCH CREATION AND PUSHING"
echo "All changes have been prepared successfully!"
echo "Ready to create and push branches for all changes."
confirm_step "Do you want to create and push all branches now?" "branch creation and push"

# Variables to track branch creation status
VENDORS_BRANCH_CREATED=0
MINA_BRANCH_CREATED=0
BINDINGS_BRANCH_CREATED=0

# Create and push branches in kimchi-stubs-vendors if needed
if [ "${VENDORS_CHANGED}" = "1" ]; then
  echo "Creating and pushing branch for kimchi-stubs-vendors..."
  cd "${KIMCHI_STUBS_VENDORS_SUBMODULE_LOCATION}" || { echo "Failed to navigate to kimchi-stubs-vendors directory" >&2; exit 1; }

  # Check if branch already exists
  if git show-ref --verify --quiet "refs/heads/${VENDORS_BRANCH}" ||
     git show-ref --verify --quiet "refs/remotes/${GIT_REMOTE}/${VENDORS_BRANCH}"; then
    echo "❌  Error: The branch '${VENDORS_BRANCH}' already exists in kimchi-stubs-vendors repository."
    exit 1
  else
    git checkout -b "${VENDORS_BRANCH}"
    VENDORS_BRANCH_CREATED=1
  fi

  # Push if we've created or updated the branch
  if [ "${VENDORS_BRANCH_CREATED}" = "1" ]; then
    echo "Pushing kimchi-stubs-vendors branch '${VENDORS_BRANCH}' to remote '${GIT_REMOTE}'..."
    git push -u "${GIT_REMOTE}" "${VENDORS_BRANCH}"
  fi
fi

# Return to Mina directory
cd "${MINA_DIR}" || { echo "Failed to navigate back to Mina directory" >&2; exit 1; }

# Create and push branch for Mina if needed
if [ "${MINA_CHANGED}" =  "1" ]; then
  echo "Creating and pushing branch for Mina..."

  if git show-ref --verify --quiet "refs/heads/${MINA_BRANCH}" ||
    git show-ref --verify --quiet "refs/remotes/origin/${MINA_BRANCH}"; then
    echo "❌  Error: The branch '${MINA_BRANCH}' already exists in Mina repository."
    exit 1
  else
    git checkout -b "${MINA_BRANCH}"
    MINA_BRANCH_CREATED=1
  fi

  # Push if we've created or updated a branch
  if [ "${MINA_BRANCH_CREATED}" = "1" ]; then
    echo "Pushing Mina branch '${MINA_BRANCH}' to remote '${GIT_REMOTE}'..."
    git push -u "${GIT_REMOTE}" "${MINA_BRANCH}"
  fi
fi

# Create and push bindings if needed
cd "${O1JS_BINDINGS_SUBMODULE_LOCATION}" || { echo "Failed to navigate back to bindings directory" >&2; exit 1; }

# Create and push branch for o1js bindings if needed
if [ "${BINDINGS_CHANGED}" = "1" ]; then
  echo "Creating and pushing branch for o1js bindings..."

  # Check if branch already exists
  if git show-ref --verify --quiet "refs/heads/${BINDINGS_BRANCH}" ||
     git show-ref --verify --quiet "refs/remotes/${GIT_REMOTE}/${BINDINGS_BRANCH}"; then
    echo "❌  Error: The branch '${BINDINGS_BRANCH}' already exists in bindings repository."
    exit 1
  else
    git checkout -b "${BINDINGS_BRANCH}"
    BINDINGS_BRANCH_CREATED=1
  fi

  # Push if we've created or updated the branch
  if [ "${BINDINGS_BRANCH_CREATED}" = "1" ]; then
    echo "Pushing o1js bindings branch '${BINDINGS_BRANCH}' to remote '${GIT_REMOTE}'..."
    git push -u "${GIT_REMOTE}" "${BINDINGS_BRANCH}"
  fi
fi

# Step 16: Create PRs
print_section "PULL REQUEST CREATION"
echo "Ready to create pull requests for all changes"
confirm_step "Do you want to create pull requests for all changes?" "PR creation"

echo "Creating pull requests..."

# Variables to store PR URLs
VENDORS_PR_URL=""
MINA_PR_URL=""
BINDINGS_PR_URL=""

# Create PR for kimchi-stubs-vendors if needed
if [ "${VENDORS_CHANGED}" = "1" ] && [ "${VENDORS_BRANCH_CREATED}" = "1" ]; then
  echo "Creating PR for kimchi-stubs-vendors (targeting ${VENDORS_TARGET_BRANCH})..."
  cd "${KIMCHI_STUBS_VENDORS_SUBMODULE_LOCATION}" || { echo "Failed to navigate to kimchi-stubs-vendors directory" >&2; exit 1; }

  # Check if PR already exists
  if gh pr list --head "${VENDORS_BRANCH}" --state open | grep -q "${VENDORS_BRANCH}"; then
    echo "A pull request already exists for branch '${VENDORS_BRANCH}' in kimchi-stubs-vendors."
    VENDORS_PR_URL=$(gh pr list --head "${VENDORS_BRANCH}" --state open --json url --jq '.[0].url')
    echo "Existing PR: ${VENDORS_PR_URL}"
  else
    # Create formatted PR title and body
    VENDORS_PR_TITLE=$(format_pr_title "Update vendor deps for proof-systems commit ${PROOF_SYSTEMS_COMMIT:0:8}")

    # Create body with proper 80-char wrapping
    VENDORS_PR_BODY=$(cat <<EOF | fold -s -w 80
This PR updates the vendored dependencies needed for proof-systems commit ${PROOF_SYSTEMS_COMMIT} from the ${PROOF_SYSTEMS_BRANCH} branch.

Related PRs:
- Proof-systems PR: ${PROOF_SYSTEMS_REPO_URL}/commit/${PROOF_SYSTEMS_COMMIT}

Please review these PRs to understand the full context of these changes.

---

Created with update-proof-systems.sh script using:
- PROOF_SYSTEMS_BRANCH=${PROOF_SYSTEMS_BRANCH}
- MINA_TARGET_BRANCH=${MINA_TARGET_BRANCH}
- VENDORS_TARGET_BRANCH=${VENDORS_TARGET_BRANCH}
- O1JS_TARGET_BRANCH=${O1JS_TARGET_BRANCH}
- BINDINGS_TARGET_BRANCH=${BINDINGS_TARGET_BRANCH}
- GIT_REMOTE=${GIT_REMOTE}
EOF
)

    VENDORS_PR_URL=$(gh pr create --title "${VENDORS_PR_TITLE}"\
      --body "${VENDORS_PR_BODY}"\
      --base "${VENDORS_TARGET_BRANCH}"\
      --repo "${VENDORS_REPO_URL}"\
      --web)

    echo "Kimchi-stubs-vendors PR created: ${VENDORS_PR_URL}"
  fi
fi

# Create PR for Mina submodule
if [ "${MINA_BRANCH_CREATED}" = "1" ]; then
  echo "Creating PR for Mina (targeting ${MINA_TARGET_BRANCH})..."
  cd "${MINA_DIR}" || { echo "Failed to navigate back to Mina directory" >&2; exit 1; }

  # Check if PR already exists
  if gh pr list --head "${MINA_BRANCH}" --state open | grep -q "${MINA_BRANCH}"; then
    echo "A pull request already exists for branch '${MINA_BRANCH}' in Mina."
    MINA_PR_URL=$(gh pr list --head "${MINA_BRANCH}" --state open --json url --jq '.[0].url')
    echo "Existing PR: ${MINA_PR_URL}"
  else
    # Prepare the base PR body
    MINA_PR_BASE_BODY="This PR updates the proof-systems submodule to commit ${PROOF_SYSTEMS_COMMIT} from the ${PROOF_SYSTEMS_BRANCH} branch."

    # Add related PRs if available
    if [ -n "${VENDORS_CHANGES}" ] && [ -n "${VENDORS_PR_URL}" ]; then
      MINA_PR_BASE_BODY="${MINA_PR_BASE_BODY}

Related PRs:
- Proof-systems commit: ${PROOF_SYSTEMS_REPO_URL}/commit/${PROOF_SYSTEMS_COMMIT}
- Kimchi-stubs-vendors vendors PR: ${VENDORS_PR_URL}"
    fi

    # Add standard footer
    MINA_PR_BASE_BODY="${MINA_PR_BASE_BODY}

Please review these PRs to understand the full context of these changes.

---

Created with update-proof-systems.sh script using:
- PROOF_SYSTEMS_BRANCH=${PROOF_SYSTEMS_BRANCH}
- MINA_TARGET_BRANCH=${MINA_TARGET_BRANCH}
- VENDORS_TARGET_BRANCH=${VENDORS_TARGET_BRANCH}
- O1JS_TARGET_BRANCH=${O1JS_TARGET_BRANCH}
- BINDINGS_TARGET_BRANCH=${BINDINGS_TARGET_BRANCH}
- GIT_REMOTE=${GIT_REMOTE}"

    # Create properly formatted PR title
    MINA_PR_TITLE=$(format_pr_title "Update proof-systems to commit ${PROOF_SYSTEMS_COMMIT:0:8}")

    # Format the full PR body with 80-char width
    MINA_PR_BODY=$(echo "${MINA_PR_BASE_BODY}" | fold -s -w 80)

    # Create the PR
    MINA_PR_URL=$(gh pr create --title "${MINA_PR_TITLE}"\
      --body "${MINA_PR_BODY}"\
      --base "${MINA_TARGET_BRANCH}"\
      --repo "${MINA_REPO_URL}"\
      --web)

    echo "Mina PR created: ${MINA_PR_URL}"
  fi
fi

# Create PR for o1js bindings if we have commits
if [ "${BINDINGS_CHANGED}" = "1" ] && [ "${BINDINGS_BRANCH_CREATED}" = "1" ]; then
  echo "Creating PR for o1js bindings (targeting ${BINDINGS_TARGET_BRANCH})..."
  cd ../../.. || { echo "Failed to navigate back to o1js root directory" >&2; exit 1; }

  # Check if PR already exists
  if gh pr list --head "${BINDINGS_BRANCH}" --state open | grep -q "${BINDINGS_BRANCH}"; then
    echo "A pull request already exists for branch '${BINDINGS_BRANCH}' in o1js."
    BINDINGS_PR_URL=$(gh pr list --head "${BINDINGS_BRANCH}" --state open --json url --jq '.[0].url')
    echo "Existing PR: ${BINDINGS_PR_URL}"
  else
    # Create a properly formatted PR title
    BINDINGS_PR_TITLE=$(format_pr_title "Update o1js bindings for proof-systems commit ${PROOF_SYSTEMS_COMMIT:0:8}")

    # Prepare the base PR body
    BINDINGS_PR_BASE_BODY="This PR updates the o1js bindings based on proof-systems commit ${PROOF_SYSTEMS_COMMIT} from the ${PROOF_SYSTEMS_BRANCH} branch.

Related PRs:
- Proof-systems PR: ${PROOF_SYSTEMS_REPO_URL}/commit/${PROOF_SYSTEMS_COMMIT}"

    # Add vendors PR reference if available
    if [ -n "${VENDORS_CHANGES}" ] && [ -n "${VENDORS_PR_URL}" ]; then
      BINDINGS_PR_BASE_BODY="${BINDINGS_PR_BASE_BODY}
- Kimchi-stubs-vendors vendors PR: ${VENDORS_PR_URL}"
    fi

    # Add Mina PR reference and standard footer
    BINDINGS_PR_BASE_BODY="${BINDINGS_PR_BASE_BODY}
- Mina submodule update PR: ${MINA_PR_URL}

Please review these PRs to understand the full context of these changes.

---

Created with update-proof-systems.sh script using:
- PROOF_SYSTEMS_BRANCH=${PROOF_SYSTEMS_BRANCH}
- MINA_TARGET_BRANCH=${MINA_TARGET_BRANCH}
- VENDORS_TARGET_BRANCH=${VENDORS_TARGET_BRANCH}
- O1JS_TARGET_BRANCH=${O1JS_TARGET_BRANCH}
- BINDINGS_TARGET_BRANCH=${BINDINGS_TARGET_BRANCH}
- GIT_REMOTE=${GIT_REMOTE}"

    # Format the full PR body with 80-char width
    BINDINGS_PR_BODY=$(echo "${BINDINGS_PR_BASE_BODY}" | fold -s -w 80)

    BINDINGS_PR_URL=$(gh pr create --title "${BINDINGS_PR_TITLE}"\
      --body "${BINDINGS_PR_BODY}"\
      --base "${BINDINGS_TARGET_BRANCH}"\
      --repo "${O1JS_REPO_URL}"\
      --web)

    echo "o1js bindings PR created: ${BINDINGS_PR_URL}"
  fi
fi

# FIXME: add o1js

print_section "PULL REQUEST SUMMARY"

# Count how many PRs were created
PR_COUNT=0
if [ -n "${VENDORS_PR_URL}" ]; then
  echo "- Kimchi-stubs-vendors: ${VENDORS_PR_URL}"
  PR_COUNT=$((PR_COUNT + 1))
fi
if [ -n "${MINA_PR_URL}" ]; then
  echo "- Mina: ${MINA_PR_URL}"
  PR_COUNT=$((PR_COUNT + 1))
fi
if [ -n "${BINDINGS_PR_URL}" ]; then
  echo "- o1js bindings: ${BINDINGS_PR_URL}"
  PR_COUNT=$((PR_COUNT + 1))
fi

if [ "${PR_COUNT}" -eq 0 ]; then
  echo "No new pull requests were created."
fi
