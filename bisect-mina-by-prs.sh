#!/usr/bin/env bash

set -e

advance_prs(){
  count=${1:-1}

  # Navigate to mina submodule
  pushd src/mina

  # Get current commit
  current_commit=$(git rev-parse HEAD)

  # Get all merge commits that contain "Merge pull request" in chronological order
  commit=$(git log --oneline --grep="Merge pull request" compatible --reverse \
    | sed '1,/'"$(git rev-parse --short HEAD)"'/d' \
    | sed -n "$count"'{p;q}' \
    | cut -d' ' -f1
  )

  # Get the commit message for informative output
  commit_msg=$(git log --oneline -1 $commit)

  echo "Updating mina submodule to next PR: $commit_msg"

  # Checkout the next merge commit
  git checkout $commit
  git reset --hard --recurse-submodules

  # Go back to parent repo and update submodule reference
  popd
}

rebuild(){
  nom build . --no-eval-cache
  #git clean -fdx && \
  #nix run .\#generate-bindings --refresh && \
  #nix develop --refresh --command npm ci && \
  #nix develop --refresh --command npm run build
}

run_test(){
  # Replace with any test that fails
  #nix develop --command timeout 300s ./run ./src/examples/zkprogram/program.ts --bundle
  nix flake check --no-eval-cache
}


reset_mina(){
  prev=$(git rev-parse HEAD)
  sub_sha=$(git ls-tree $prev src/mina | awk '{print $3}')
  git -C src/mina checkout $sub_sha
  git -C src/mina reset --hard --recurse-submodules

}

check_num_prs(){
  reset_mina
  #echo "SANITY CHECK"
  #rebuild && run_test
  #echo "END SANITY CHECK"
  advance_prs "$1"
  rebuild && run_test
}

reset_mina
num_prs=$( \
  git -C src/mina log --oneline --grep="Merge pull request" compatible --reverse \
  | sed '1,/'"$(git -C src/mina rev-parse --short HEAD)"'/d' \
  | wc -l)

echo $num_prs

low=0
high=$num_prs

while (( low < high -1 )); do
    mid=$(( (low + high + 1) / 2 ))
    echo TESTING $mid
    if check_num_prs $mid
    then
      echo "$(git -C src/mina rev-parse HEAD) - Works" >> builds.log
      low=$(( mid ))
    else
      high=$(( mid ))
      echo "$(git -C src/mina rev-parse HEAD) - Fails" >> builds.log
    fi
    echo $low $mid $high
done

reset_mina
advance_prs $low
works=$(git -C src/mina rev-parse HEAD)
reset_mina
advance_prs $high
breaks=$(git -C src/mina rev-parse HEAD)
echo Works at $works
echo Broken at $breaks
echo Broken by $(git -C src/mina log --oneline -1 $breaks)
