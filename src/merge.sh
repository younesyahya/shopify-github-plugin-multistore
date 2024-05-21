#!/bin/bash
# Usage: ./merge.sh <from_branch> <to_branch>

FROM_BRANCH=$1 # main
TO_BRANCH=$2 # live-canada


# Configure Git user
GIT_USER_NAME="GitHub Action: Multi Store Merge Bot"
GIT_USER_EMAIL="bot@the-deployer.fr"

# Exit immediately if a command exits with a non-zero status
set -e

# Set Git user details
git config --global user.name "$GIT_USER_NAME"
git config --global user.email "$GIT_USER_EMAIL"

git fetch origin $FROM_BRANCH
git fetch origin $TO_BRANCH

# Checkout the source branch and pull the latest changes
git checkout $FROM_BRANCH || git checkout -b $FROM_BRANCH origin/$FROM_BRANCH
git pull origin $FROM_BRANCH

# Checkout the target branch and pull the latest changes
git checkout $TO_BRANCH || git checkout -b $TO_BRANCH origin/$TO_BRANCH
git pull origin $TO_BRANCH

# Start the merge but don't commit automatically, favoring 'theirs' strategy option for conflicts
if git merge --no-commit --no-ff --strategy-option theirs --allow-unrelated-histories $FROM_BRANCH; then
    
    # Remove modifications on JSON files from the current commit, ignoring errors
    git restore --staged templates/*.json config/settings_data.json sections/*.json 
    git restore templates/*.json config/settings_data.json sections/*.json 

    # Commit the merge with a message
    git commit -m "GitHub Action: Merge $FROM_BRANCH into $TO_BRANCH"
    echo "Merge successful - pushing changes to $TO_BRANCH"

    # Push the changes to the 'to' branch on the origin remote
    git push --force --set-upsteam origin $TO_BRANCH

    # Checkout the source branch
    git checkout $FROM_BRANCH

    # Indicate success
    echo "success" > merge-status.txt
else
    # Abort the merge and indicate failure
    echo "something goes wrong" > merge-status.txt
    git merge --abort
fi
