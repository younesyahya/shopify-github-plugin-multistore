#!/bin/bash
# Usage: ./merge.sh <from_branch> <to_branch>

FROM_BRANCH=$1
TO_BRANCH=$2

# Get the current commit hash
commit_hash=$(git rev-parse --short HEAD)

# Checkout the target branch
git checkout $TO_BRANCH && git pull origin $TO_BRANCH || git checkout -b $TO_BRANCH origin/$TO_BRANCH

# Start the merge but don't commit automatically, favorise 'theirs' strategy option for conflicts
if git merge --no-edit --no-commit --no-ff --strategy-option theirs --allow-unrelated-histories $FROM_BRANCH; then
    
    # Checkout specific files from the current commit, ignoring errors
    git checkout ${commit_hash} templates/\*.json 2>/dev/null || true
    git checkout ${commit_hash} sections/\*.json 2>/dev/null || true
    git checkout ${commit_hash} locales/\*.json 2>/dev/null || true
    git checkout ${commit_hash} config/settings_data.json 2>/dev/null || true

    # If reset is successful and there are no conflicts
    if [ $? -eq 0 ]; then
        git commit -m "GitHub Action: Merge $FROM_BRANCH  into $TO_BRANCH"

        # Push the changes to the 'to' branch on the origin remote
        git push --force origin $TO_BRANCH
        echo "success" > merge-status.txt
    else
        echo "something goes wrong" > merge-status.txt
    fi
else
    echo "something goes wrong" > merge-status.txt
    git merge --abort
fi
