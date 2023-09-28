#!/bin/bash

# Checking if commit message is supplied
if [ -z "$1" ]
then
    echo "No commit message provided, exiting."
    exit 1
fi

echo "==== Current Working Branch ===="
# Check the current working branch
currentBranch=$(git rev-parse --abbrev-ref HEAD)
echo "Current working branch: $currentBranch"

echo "==== Git Status Before Changes are Added ===="
# Print git status
git status

echo "==== Changes in Files ===="
# List changed files
git diff --name-only

echo "==== Adding Changes to Staging Area ===="
# Add all changes to the staging area
git add .

echo "==== Committing Changes ===="
# Commit the changes
git commit -m "$1"

echo "==== Details of Latest Commit ===="
# Print the most recent commit
git log -1 --pretty=format:"%h%x09%an%x09%ad%x09%s"

echo "==== Pushing Changes to 'main' Branch ===="
# Push the changes to the 'main' branch
git push origin main

echo "==== Git Status After Push ===="
# Print git status after push
git status

echo "==== Log of Last 5 Commits ===="
# Print the log of the latest 5 commits 
git log --pretty=format:"%h%x09%an%x09%ad%x09%s" -5

echo "==== Verifying Everything Worked as Planned ===="
uncommitted_changes=$(git status --porcelain)
if [[ -z "$uncommitted_changes" ]]; then
    status=$(git status | grep 'Your branch is up to date')
    if [[ -n "$status" ]] ; then
        echo "All changes were successfully committed and pushed!"
    else
        echo "Changes were committed, but not successfully pushed."
    fi
else
    echo "There are uncommitted changes. Process did not complete successfully."
fi

# Print the latest commit hash
latest_commit=$(git rev-parse --short HEAD)
echo "Latest commit hash: $latest_commit"

# Print the current local time
current_time=$(date)
echo "Current local time: $current_time"