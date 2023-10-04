echo "This script will overwrite everything locally with the remote repository. Are you sure you want to continue? (y/n)"
read confirmation

if [[ $confirmation == "y" || $confirmation == "Y" ]]; then
    # Echo out what we're doing
    echo "Preparing to sync your local repository with the remote..."

    # Fetch the latest changes from the remote repository
    echo "Fetching latest changes from GitHub..."
    git fetch origin

    # Display the latest commit that was fetched
    echo "The latest commit fetched is:"
    git log origin/main -1

    # Attempt to merge the latest changes into your current workspace
    echo "Attempting to merge latest changes into your workspace..."
    git merge origin/main

    # Check if the merge was successful
    merge_exit_status=$?  # save the exit status of the git merge command
    if [[ $merge_exit_status -ne 0 ]]; then
        echo "Merge failed due to conflicts."
        echo "Attempting to overwrite local changes with the remote repository..."
        git reset --hard origin/main
        echo "Local changes have been overwritten."
    else
        echo "Merge successful."
    fi

    # Print out that it's done
    echo "All done! Your workspace should now be updated with the latest changes from GitHub."

    # Print out suggestion for next steps
    echo "Do your coding magic now! Remember to commit and push your changes when you're done."
else
    echo "Script aborted."
    exit 1
fi