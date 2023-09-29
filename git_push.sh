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
commit_result=$(git commit -m "$1")

echo "==== Details of Latest Commit ===="
# Print the most recent commit
git log -1 --pretty=format:"%h%x09%an%x09%ad%x09%s"

echo "==== Pushing Changes to 'main' Branch ===="
# Push the changes to the 'main' branch
push_result=$(git push origin main)

# Create a time stamp if push was successful
if [[ $? -eq 0 ]]; then
    # The push was successful. Record the current time.
    date +%s > last_successful_push.timestamp
fi

echo "==== Git Status After Push ===="
# Print git status after push
git status

echo "==== Log of Last 5 Commits ===="
# Print the log of the latest 5 commits 
git log --pretty=format:"%h%x09%an%x09%ad%x09%s" -5

echo "==== Verifying Everything Worked as Planned ===="
uncommitted_changes=$(git status --porcelain)
if [[ -z "$uncommitted_changes" ]]; then
    if [[ $commit_result =~ "nothing to commit" ]]; then
        echo -e "\033[0;33mAlert! No changes detected in the files, nothing to commit or push.\033[0m"   # Yellow
    elif [[ $push_result =~ "Everything up-to-date" ]]; then
        echo -e "\033[0;33mAlert! No new commits to push.\033[0m"   # Yellow
    else
        echo -e "\033[0;32mAll changes were successfully committed and pushed!\033[0m"     # Green
    fi
else
    echo -e "\033[0;31mError occurred! There are uncommitted changes. Process did not complete successfully.\033[0m"  # Red
fi

# Print the latest commit hash
latest_commit=$(git rev-parse --short HEAD)
echo "Latest commit hash: $latest_commit"

# Print the current local time
current_time=$(date)
echo "Current local time: $current_time"
echo "==== Time Since Last Successful Push ===="

current_time=$(date +%s)                # Current timestamp in seconds

# Check if the last_successful_push.timestamp file exits
if [ -f last_successful_push.timestamp ]; then
    # Read the timestamp from the file
    last_successful_push=$(cat last_successful_push.timestamp)

    time_diff=$((current_time - last_successful_push))      # Difference in timestamps

    # Calculate days, hours, minutes, and seconds
    days=$((time_diff/(60*60*24)))
    hours=$((time_diff/(60*60)%24))
    minutes=$((time_diff/60%60))
    seconds=$((time_diff%60))

    # Choose the appropriate format based on the units of time that have elapsed
    if [[ $days -gt 0 ]]; then
        echo "Time since last successful push: $days days, $hours hours, $minutes minutes, $seconds seconds."
    elif [[ $hours -gt 0 ]]; then
        echo "Time since last successful push: $hours hours, $minutes minutes, $seconds seconds."
    elif [[ $minutes -gt 0 ]]; then
        echo "Time since last successful push: $minutes minutes, $seconds seconds."
    else
        echo "Time since last successful push: $seconds seconds."
    fi
else
    echo "No successful push has been recorded yet. Run this script after a successful push to start tracking."
fi