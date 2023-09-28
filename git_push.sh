#!/bin/bash

# Checking if commit message is supplied
if [ -z "$1" ]
then
    echo "No commit message provided, exiting."
    exit 1
fi

# Check the current working branch
currentBranch=$(git rev-parse --abbrev-ref HEAD)
echo "Current working branch: $currentBranch"

# Check the status of 
echo "Git status before changes are added:"
git status

# Seeing which files have changes
echo "Changed files:"
git diff --name-only

# Add all changes to the staging area
git add .

# Commit the changes
git commit -m "$1"

# Print the most recent commit
echo "Details of latest commit:"
git log -1 --pretty=format:"%h%x09%an%x09%ad%x09%s"

# Push the changes to the 'main' branch
git push origin main

# Check the status after push
echo "Git status after push:"
git status

# Log of latest 5 commits
echo "Log of last 5 commits:"
git log --pretty=format:"%h%x09%an%x09%ad%x09%s" -5