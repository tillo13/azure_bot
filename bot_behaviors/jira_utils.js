const axios = require('axios');
const jira_server = process.env['2023sept8_JIRA_SERVER'];
const username = process.env['2023sept8_JIRA_USERNAME'];
const api_token = process.env['2023sept8_JIRA_TOKEN'];

async function makeJiraRequest(url, payload, method = 'GET') {
    const config = {
        method,
        url: `${jira_server}${url}`,
        headers: {
            'Authorization': `Basic ${Buffer.from(`${username}:${api_token}`).toString('base64')}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        data: payload
    };
    
    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error(error.message);
        throw error;
    }
}

async function getIssuesAssignedToCurrentUser() {
    try {
        const issues = await makeJiraRequest(`/rest/api/3/search?jql=assignee=currentuser()`);
        return issues;
    } catch (err) {
        console.error(err.message);
        throw err;
    }
}

async function createJiraTask(summary, description) {
    const url = `/rest/api/3/issue/`;
    const taskData = {
        "fields": {
            "project": {
                "key": "ADD"
            },
            "summary": summary,
            "description": description,
            "issuetype": {
                "name": "Task"
            },
            "parent": {
                "key": "ADD-615"
            }
        }
    };

    try {
        const response = await makeJiraRequest(url, taskData, 'POST');
        return response;
    } catch (err) {
        console.error(err.message);
        throw err;
    }
}

module.exports = {
    getIssuesAssignedToCurrentUser,
    createJiraTask
}