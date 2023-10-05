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

module.exports = {
    getIssuesAssignedToCurrentUser,
}