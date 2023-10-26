# Check if the working directory is clean
uncommitted_files=$(git status --porcelain)
if [[ `echo "$uncommitted_files" | grep -v 'pull_latest_from_git.sh'` ]]; then
    echo "Your working directory has uncommitted changes in files other than 'pull_latest_from_git.sh'. Please commit or stash your changes before proceeding."
    exit 1
elif [[ `echo "$uncommitted_files" | grep 'pull_latest_from_git.sh'` ]]; then
        echo "It seems you're making changes to 'pull_latest_from_git.sh'. Don't forget to commit and push these changes using your git.push.sh script when you're done."
fi

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
    echo -e "\e[33mThe following files will be updated:\n$(git diff --name-only $LOCAL $REMOTE)\e[0m" # Print file list in yellow
    echo -e "\nThis script will align your local repository with the remote repository, potentially overwriting local changes. Are you sure you want to continue? (y/n)"
    read confirmation
elif [ $REMOTE = $BASE ]; then
    echo "Your local repository is ahead of the remote repository. You may want to push your changes."
    exit 1
else
    echo "Your local repository has diverged from the remote repository. Proceeding to sync..."
    echo -e "\e[33mThe following files will be updated:\n$(git diff --name-only $LOCAL $REMOTE)\e[0m" # Print file list in yellow
    echo -e "\nThis script will align your local repository with the remote repository, potentially overwriting local changes. Are you sure you want to continue? (y/n)"
    read confirmation
fi

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