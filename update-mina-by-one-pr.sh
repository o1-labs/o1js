#!/usr/bin/env bash


advance(){
  # Navigate to mina submodule
  pushd src/mina

  # Fetch latest changes
  git fetch origin compatible

  # Get current commit
  current_commit=$(git rev-parse HEAD)

  # Get all merge commits that contain "Merge pull request" in chronological order
  all_merges=$(git log --oneline --grep="Merge pull request" compatible --reverse)

  # Find the current commit in the list and get the next one
  next_merge=$(echo "$all_merges" | grep -A 1 "^$(git rev-parse --short $current_commit)" | tail -n 1 | cut -d' ' -f1)

  # If that didn't work, try a different approach - find commits after current commit date
  if [ -z "$next_merge" ] || [ "$next_merge" = "$(git rev-parse --short $current_commit)" ]; then
      current_date=$(git log -1 --format="%ct" $current_commit)
      next_merge=$(git log --oneline --grep="Merge pull request" compatible --since="$current_date" --reverse | head -n 2 | tail -n 1 | cut -d' ' -f1)
  fi

  if [ -z "$next_merge" ]; then
      echo "No newer merge commits found on compatible branch"
      exit 1
  fi

  # Get the commit message for informative output
  commit_msg=$(git log --oneline -1 $next_merge)

  echo "Updating mina submodule to next PR: $commit_msg"

  # Checkout the next merge commit
  git checkout $next_merge
  git reset --hard --recurse-submodules

  # Go back to parent repo and update submodule reference
  popd

}


rebuild(){
  # Clean build
  git clean -fdx
  #nix flake update mina
  nix run .#generate-bindings --refresh
  nix develop --command npm ci
  nix develop --command npm run build
}

run_test(){
  # Replace this with any appropriate test that fails on the newest mina commit
  nix develop --command timeout 300s ./run ./src/examples/zkprogram/program.ts --bundle

  # stage only if the test worked
  git add src/mina
}


test_prs(){
  set -e
  while run_test
  do
    advance
    rebuild
  done
  set +e
}
