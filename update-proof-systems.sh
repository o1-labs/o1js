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
}

# Run requirements check
check_requirements

# Check if PROOF_SYSTEMS_BRANCH is provided
if [ -z "${PROOF_SYSTEMS_BRANCH}" ]; then
  echo "Error: PROOF_SYSTEMS_BRANCH environment variable is not set." >&2
  echo "Usage: PROOF_SYSTEMS_BRANCH=branch_name ./update-proof-systems.sh" >&2
  exit 1
fi

# Set default target branches
MINA_TARGET_BRANCH="${MINA_TARGET_BRANCH:-compatible}"
VENDORS_TARGET_BRANCH="${VENDORS_TARGET_BRANCH:-main}"
O1JS_TARGET_BRANCH="${O1JS_TARGET_BRANCH:-main}"
BINDINGS_TARGET_BRANCH="${BINDINGS_TARGET_BRANCH:-main}"

# Set default git remote name (origin is standard default)
GIT_REMOTE="${GIT_REMOTE:-origin}"

# Set confirmation behavior (YES_TO_ALL=1 to bypass all confirmations)
YES_TO_ALL="${YES_TO_ALL:-0}"

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
    echo "❌ ${step_name} skipped. Exiting."
    exit 0
  fi
  echo "✅ Proceeding with ${step_name}"
}

# Warning about environment
echo "⚠️  WARNING: This script runs commands directly in your environment, NOT through Nix."
echo "⚠️  Please verify you are in the correct OPAM switch with all dependencies installed."
echo "⚠️  Incorrect setup may result in build failures or inconsistent bindings."
echo ""
echo "🔍 Current OPAM switch:"
opam switch list | grep -F "→"
echo ""

# Display and confirm target branches
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
echo "You can customize settings by setting environment variables:"
echo "- MINA_TARGET_BRANCH (default: compatible)"
echo "- VENDORS_TARGET_BRANCH (default: main)"
echo "- O1JS_TARGET_BRANCH (default: main)"
echo "- BINDINGS_TARGET_BRANCH (default: main)"
echo "- GIT_REMOTE (default: origin)"
echo "- YES_TO_ALL=1 (default: 0) - skip confirmations"
echo ""

# Confirm initial settings
confirm_step "Do you want to proceed with these settings?" "initial setup"

echo "Starting proof-systems update process with branch: ${PROOF_SYSTEMS_BRANCH}"

# Step 1: Navigate to Mina submodule
cd src/mina || { echo "Failed to navigate to src/mina directory" >&2; exit 1; }
MINA_DIR="$(pwd)"

# Step 2: Ensure all submodules are initialized first
git submodule update --init --recursive
echo "Initialized all submodules in Mina"

# Step 3: Checkout to the specified branch of proof-systems and update submodules
cd src/lib/crypto/proof-systems || { echo "Failed to navigate to proof-systems directory" >&2; exit 1; }
git fetch "${GIT_REMOTE}"
echo "Ready to checkout proof-systems to branch: ${PROOF_SYSTEMS_BRANCH}"
confirm_step "Do you want to update proof-systems to this branch?" "proof-systems update"

git checkout "${PROOF_SYSTEMS_BRANCH}"
git submodule update --init --recursive
# Get the commit hash for use in commit messages
PROOF_SYSTEMS_COMMIT=$(git rev-parse HEAD)
echo "Checked out proof-systems to branch: ${PROOF_SYSTEMS_BRANCH} (commit: ${PROOF_SYSTEMS_COMMIT})"

# Step 4: Run cargo vendor to update kimchi-stubs-vendors
cd ../kimchi_bindings/stubs/ || { echo "Failed to navigate to stubs directory" >&2; exit 1; }
confirm_step "Do you want to update kimchi-stubs-vendors with cargo vendor?" "kimchi-stubs-vendors update"
echo "Running cargo vendor for kimchi-stubs-vendors..."
cargo vendor kimchi-stubs-vendors

# Step 5: Check if there are changes in the vendors directory
cd kimchi-stubs-vendors || { echo "Failed to navigate to kimchi-stubs-vendors directory" >&2; exit 1; }
VENDORS_CHANGES="$(git status --porcelain)"

# Return to the Mina root directory for commits
cd "${MINA_DIR}" || { echo "Failed to navigate back to Mina directory" >&2; exit 1; }

# Step 6: Make the first commit - updating proof-systems in src/mina
echo "Ready to commit proof-systems update in Mina"
confirm_step "Do you want to commit the proof-systems update in Mina?" "Mina proof-systems commit"

git add src/lib/crypto/proof-systems
git commit -m "Update proof-systems to commit ${PROOF_SYSTEMS_COMMIT}

This commit updates the proof-systems submodule to commit ${PROOF_SYSTEMS_COMMIT} from the ${PROOF_SYSTEMS_BRANCH} branch."

# Step 7: If there are changes in vendors, create a separate commit and PR in the kimchi-stubs-vendors repo
if [ -n "${VENDORS_CHANGES}" ]; then
  # Save current directory to return to later
  CURRENT_DIR="$(pwd)"

  # Navigate to the kimchi-stubs-vendors repository
  cd src/lib/crypto/kimchi_bindings/stubs/kimchi-stubs-vendors || { echo "Failed to navigate to kimchi-stubs-vendors directory" >&2; exit 1; }
  VENDORS_REPO_DIR="$(pwd)"

  # Create a branch for changes
  echo "Ready to create branch and commit for kimchi-stubs-vendors changes"
  confirm_step "Do you want to create a branch and commit kimchi-stubs-vendors changes?" "kimchi-stubs-vendors branch and commit"

  KIMCHI_BRANCH="vendors-update-${PROOF_SYSTEMS_BRANCH}"
  git checkout -b "${KIMCHI_BRANCH}"

  # Commit all changes
  git add .
  git commit -m "Update vendor dependencies for proof-systems commit ${PROOF_SYSTEMS_COMMIT}

This commit updates the vendored dependencies needed for proof-systems commit ${PROOF_SYSTEMS_COMMIT} from the ${PROOF_SYSTEMS_BRANCH} branch."

  # Push the branch to remote
  echo "Ready to push kimchi-stubs-vendors changes to remote '${GIT_REMOTE}'"
  confirm_step "Do you want to push kimchi-stubs-vendors changes to remote '${GIT_REMOTE}'?" "kimchi-stubs-vendors push"

  git push -u "${GIT_REMOTE}" "${KIMCHI_BRANCH}"

  # Prepare command to create PR for kimchi-stubs-vendors
  echo ""
  echo "To create a pull request for kimchi-stubs-vendors changes, use:"
  echo "cd \"${VENDORS_REPO_DIR}\" && gh pr create --title \"Update vendor dependencies for ${PROOF_SYSTEMS_BRANCH}\" --body \"This PR updates the vendored dependencies needed for the proof-systems branch ${PROOF_SYSTEMS_BRANCH}.

Related PRs:
- Proof-systems PR: [link to the proof-systems PR]
- Other relevant PRs: [add links to any other related PRs]

Please review these PRs to understand the full context of these changes.\""

  # Return to the Mina directory
  cd "${CURRENT_DIR}" || { echo "Failed to navigate back to Mina directory" >&2; exit 1; }

  # Now also commit the reference to kimchi-stubs-vendors in Mina
  echo "Ready to commit kimchi-stubs-vendors reference update in Mina"
  confirm_step "Do you want to commit the kimchi-stubs-vendors reference update in Mina?" "kimchi-stubs-vendors reference commit"

  git add src/lib/crypto/kimchi_bindings/stubs/kimchi-stubs-vendors
  git commit -m "Update kimchi-stubs-vendors reference for proof-systems commit ${PROOF_SYSTEMS_COMMIT}

This commit updates the reference to kimchi-stubs-vendors for proof-systems commit ${PROOF_SYSTEMS_COMMIT} from the ${PROOF_SYSTEMS_BRANCH} branch."
fi

# Return to the o1js root directory
cd ../../.. || { echo "Failed to navigate back to o1js root directory" >&2; exit 1; }

# Step 8: Update Mina submodule in o1js
echo "Ready to update Mina submodule in o1js"
confirm_step "Do you want to update the Mina submodule in o1js?" "Mina submodule update"

echo "Updating Mina submodule in o1js recursively..."
git submodule update --init --recursive

# Step 9: Create a commit in o1js updating Mina
echo "Ready to commit Mina submodule update in o1js"
confirm_step "Do you want to commit the Mina submodule update in o1js?" "Mina submodule commit"

git add src/mina
git commit -m "Update Mina submodule for proof-systems commit ${PROOF_SYSTEMS_COMMIT}

This updates the Mina submodule which includes the changes to proof-systems commit ${PROOF_SYSTEMS_COMMIT} from the ${PROOF_SYSTEMS_BRANCH} branch."

# Step 10: Clean before generating bindings
echo "Ready to clean build artifacts"
confirm_step "Do you want to clean build artifacts (dune clean, cargo clean)?" "build artifact cleaning"

echo "Running dune clean..."
dune clean

echo "Running cargo clean in all relevant directories..."
# Find all Cargo.toml files, exclude certain directories, and run cargo clean
find . -name Cargo.toml \
  -not -path "*/target/*" \
  | grep -vE "ethereum-optimism|kimchi-stubs-vendors" \
  | xargs -I {} dirname {} \
  | sort -u \
  | xargs -I {} bash -c '
      echo "Cleaning {}"
      cd "{}" && cargo clean
    '

# Step 11: Run the update-bindings command
echo "Ready to regenerate bindings"
confirm_step "Do you want to regenerate the bindings with npm run build:update-bindings?" "bindings regeneration"

echo "Regenerating bindings with npm run build:update-bindings..."
npm run build:update-bindings

# Step 12: Create a new branch for the bindings update
echo "Ready to create branch for updated bindings"
confirm_step "Do you want to create a branch for the updated bindings?" "bindings branch creation"

BINDINGS_BRANCH="bindings-update-${PROOF_SYSTEMS_BRANCH}"
git checkout -b "${BINDINGS_BRANCH}"

# Step 13: Commit the updated bindings
echo "Ready to commit updated bindings"
confirm_step "Do you want to commit the updated bindings?" "bindings commit"

echo "Committing updated bindings..."
git add src/bindings/MINA_COMMIT src/bindings/compiled
git commit -m "Update o1js bindings for proof-systems commit ${PROOF_SYSTEMS_COMMIT}

This updates the o1js bindings based on proof-systems commit ${PROOF_SYSTEMS_COMMIT} from the ${PROOF_SYSTEMS_BRANCH} branch."

# Step 14: Summary of changes before PR creation
echo ""
echo "Process completed successfully!"
echo "- Proof-systems updated to branch: ${PROOF_SYSTEMS_BRANCH} (commit: ${PROOF_SYSTEMS_COMMIT})"
if [ -n "${VENDORS_CHANGES}" ]; then
  echo "- Kimchi-stubs-vendors changes committed to branch: ${KIMCHI_BRANCH} in kimchi-stubs-vendors repo"
  echo "- Reference to kimchi-stubs-vendors updated in Mina"
fi
echo "- Mina submodule updated and committed in o1js"
echo "- Bindings have been regenerated and committed to branch: ${BINDINGS_BRANCH}"

# Step 15: Ask user if they want to create PRs
confirm_step "Do you want to create pull requests for all changes?" "PR creation"

# Step 16: Create PRs
echo "Creating pull requests..."

# Variables to store PR URLs
VENDORS_PR_URL=""
MINA_PR_URL=""
BINDINGS_PR_URL=""

# Create PR for kimchi-stubs-vendors if needed
if [ -n "${VENDORS_CHANGES}" ]; then
  echo "Creating PR for kimchi-stubs-vendors (targeting ${VENDORS_TARGET_BRANCH})..."
  cd "${VENDORS_REPO_DIR}" || { echo "Failed to navigate to kimchi-stubs-vendors directory" >&2; exit 1; }

  VENDORS_PR_URL=$(gh pr create --title "Update vendor dependencies for proof-systems commit ${PROOF_SYSTEMS_COMMIT}" \
    --body "This PR updates the vendored dependencies needed for proof-systems commit ${PROOF_SYSTEMS_COMMIT} from the ${PROOF_SYSTEMS_BRANCH} branch.

Related PRs:
- Proof-systems PR: [link to the proof-systems PR]

Please review these PRs to understand the full context of these changes." \
    --base "${VENDORS_TARGET_BRANCH}" \
    --web)

  echo "Kimchi-stubs-vendors PR created: ${VENDORS_PR_URL}"
fi

# Create PR for Mina submodule
echo "Creating PR for Mina (targeting ${MINA_TARGET_BRANCH})..."
cd "${MINA_DIR}" || { echo "Failed to navigate back to Mina directory" >&2; exit 1; }

# Prepare the body with links to related PRs
MINA_PR_BODY="This PR updates the proof-systems submodule to commit ${PROOF_SYSTEMS_COMMIT} from the ${PROOF_SYSTEMS_BRANCH} branch."
if [ -n "${VENDORS_CHANGES}" ]; then
  MINA_PR_BODY="${MINA_PR_BODY}

Related PRs:
- Proof-systems PR: [link to the proof-systems PR]
- Kimchi-stubs-vendors vendors PR: ${VENDORS_PR_URL}"
fi

MINA_PR_URL=$(gh pr create --title "Update proof-systems to commit ${PROOF_SYSTEMS_COMMIT}" \
  --body "${MINA_PR_BODY}

Please review these PRs to understand the full context of these changes." \
  --base "${MINA_TARGET_BRANCH}" \
  --web)

echo "Mina PR created: ${MINA_PR_URL}"

# Create PR for o1js bindings
echo "Creating PR for o1js bindings (targeting ${BINDINGS_TARGET_BRANCH})..."
cd ../../.. || { echo "Failed to navigate back to o1js root directory" >&2; exit 1; }

# Prepare the body with links to related PRs
BINDINGS_PR_BODY="This PR updates the o1js bindings based on proof-systems commit ${PROOF_SYSTEMS_COMMIT} from the ${PROOF_SYSTEMS_BRANCH} branch.

Related PRs:
- Proof-systems PR: [link to the proof-systems PR]"

if [ -n "${VENDORS_CHANGES}" ]; then
  BINDINGS_PR_BODY="${BINDINGS_PR_BODY}
- Kimchi-stubs-vendors vendors PR: ${VENDORS_PR_URL}"
fi

BINDINGS_PR_BODY="${BINDINGS_PR_BODY}
- Mina submodule update PR: ${MINA_PR_URL}

Please review these PRs to understand the full context of these changes."

BINDINGS_PR_URL=$(gh pr create --title "Update o1js bindings for proof-systems commit ${PROOF_SYSTEMS_COMMIT}" \
  --body "${BINDINGS_PR_BODY}" \
  --base "${BINDINGS_TARGET_BRANCH}" \
  --web)

echo "o1js bindings PR created: ${BINDINGS_PR_URL}"

echo ""
echo "All pull requests have been created:"
if [ -n "${VENDORS_CHANGES}" ]; then
  echo "- Kimchi-stubs-vendors: ${VENDORS_PR_URL}"
fi
echo "- Mina: ${MINA_PR_URL}"
echo "- o1js bindings: ${BINDINGS_PR_URL}"
