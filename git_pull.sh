#!/bin/bash

# Echo out what we're doing
echo "Preparing to sync your local repository with the remote..."

# Fetch the latest changes from the remote repository
echo "Fetching latest changes from GitHub..."
git fetch origin

# Display the latest commit that was fetched
echo "The latest commit fetched is:"
git log origin/main -1

# Merge the latest changes into your current workspace
echo "Merging latest changes into your workspace..."
git merge origin/main

# Print out that it's done
echo "All done! Your workspace should now be updated with the latest changes from GitHub."

# Print out suggestion for next steps
echo "Do your coding magic now! Remember when you're done to go to this directory and then push the changes with './git_push.sh <commit-message>'."