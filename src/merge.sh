#!/bin/bash
# Usage: ./merge.sh <from_branch> <to_branch>

FROM_BRANCH=$1
TO_BRANCH=$2

# Checkout the target branch
git checkout $TO_BRANCH

# Start the merge but don't commit automatically
if git merge --no-commit --no-ff $FROM_BRANCH; then
    # Reset changes in specific JSON files
    git reset HEAD templates/*.json config/settings_data.json locales/*.json
    git checkout -- templates/*.json config/settings_data.json locales/*.json

    # If reset is successful and there are no conflicts
    if [ $? -eq 0 ]; then
        git commit -m "Merged $FROM_BRANCH into $TO_BRANCH with selective JSON resets"
        echo "success" > merge-status.txt
    else
        echo "something goes wrong" > merge-status.txt
    fi
else
    echo "something goes wrong" > merge-status.txt
    git merge --abort
fi
