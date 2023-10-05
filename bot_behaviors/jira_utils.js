const axios = require('axios');
const os = require('os');

// Get the JIRA config from the environment variable
const api_token = process.env['2023sept8_JIRA_TOKEN'];
const username = process.env['2023sept8_JIRA_USERNAME'];
const jira_server = process.env['2023sept8_JIRA_SERVER'];

/**
* Makes an HTTP request to the JIRA server and returns the response.
*/
async function makeJiraRequest(url, payload) {
    const config = {
        method: 'GET',
        url: `${jira_server}${url}`,
        headers: {
            'Authorization': `Basic ${Buffer.from(`${username}:${api_token}`).toString('base64')}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
    };

    if (payload) {
        config.data = payload;
    }

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error(err.message);
        throw err;
    }
}

/**
 Retrieves all issues assigned to the current user.
*/
async function getIssuesAssignedToCurrentUser() {
    try {
        const issues = await makeJiraRequest(`/rest/api/3/search?jql=assignee=currentuser()`);
        return issues;
    } catch (err) {
        console.error(err.message);
        throw err;
    }
}
/**
 * Creates a new JIRA task.
 * @param {Object} context - The chat context.
 */
async function createJiraTask(context) {
    // Define the URL for the JIRA REST API endpoint
    const url = `/rest/api/3/issue/`;

    // Extract the task summary from the context
    const summary = context.activity.text.replace('$createjira ', '');

    // Define the data for the new task
    const taskData = {
        "fields": {
            "project": {
                "key": "ADD"  // Replace with your project key
            },
            "summary": "Test from teams",
            "description": summary,
            "issuetype": {
                "name": "Task"
            },
            "parent": {
                "key": "ADD-615" // Replace with your parent issue key
            }
        }
    };

    try {
        // Call the makeJiraRequest function to make a POST request to the JIRA API
        const task = await makeJiraRequest(url, taskData, 'POST');

        // If the request is successful, send a message back to the user
        return sendMessageResponse(context, `Task ${task.key} has been created under ADD-615 with the description: ${summary}`);
    } catch (err) {
        console.error(err.message);
        return sendMessageResponse(context, `Error creating JIRA task: ${err.message}`);
    }
}

module.exports = {
    getIssuesAssignedToCurrentUser, createJiraTask,
}