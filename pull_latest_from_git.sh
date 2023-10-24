echo "Fetching the latest changes from GitHub..."
git fetch origin

# Check the status of the local and remote repositories
UPSTREAM=${1:-'@{u}'}
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse "$UPSTREAM")
BASE=$(git merge-base @ "$UPSTREAM")

# Decide what to do based on the status
if [ $LOCAL = $REMOTE ]; then
    echo "Your local repository is up-to-date with the remote repository. No need to sync."
    exit 0
elif [ $LOCAL = $BASE ]; then
    echo "Your local repository is behind the remote repository. Proceeding to sync..."
elif [ $REMOTE = $BASE ]; then
    echo "Your local repository is ahead of the remote repository. You may want to push your changes."
    exit 1
else
    echo "Your local repository has diverged from the remote repository. Proceeding to sync..."
fi

echo "This script will overwrite everything locally with the remote repository. Are you sure you want to continue? (y/n)"
read confirmation

if [[ $confirmation == "y" || $confirmation == "Y" ]]; then
    echo "Preparing to sync your local repository with the remote..."
    
    git merge origin/main

    merge_exit_status=$?
    if [[ $merge_exit_status -ne 0 ]]; then
        echo "Merge failed due to conflicts."
        echo "Attempting to overwrite local changes with the remote repository..."
        git reset --hard origin/main
        echo "Local changes have been overwritten."
    else
        echo "Merge successful."
    fi

    echo "All done! Your workspace should now be updated with the latest changes from GitHub."
    echo "Do your coding magic now! Remember to commit and push your changes when you're done."
else
    echo "Script aborted."
    exit 1
fi