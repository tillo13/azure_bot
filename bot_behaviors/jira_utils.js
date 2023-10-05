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
        console.log('\n*******JIRA_UTILS: Request URL:', url); // logging the URL
        console.log('\n*******JIRA_UTILS: Request Method:', method); // logging the HTTP Method
        console.log('\n*******JIRA_UTILS: Request Payload:', JSON.stringify(payload, null, 2)); // logging the payload
        console.log('\n*******JIRA_UTILS: Request Config:', JSON.stringify(config, null, 2)); 

        const response = await axios(config);
        
        console.log('\n*******JIRA_UTILS: Response Status:', response.status); // logging the Response status
        console.log('\n*******JIRA_UTILS: Response Data:', response.data); // logging the Response data

        return response.data;
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('\n*******JIRA_UTILS: Server Response:', error.response.data);
            console.error('\n*******JIRA_UTILS: Response Status:', error.response.status);
            console.error('\n*******JIRA_UTILS: Response Headers:', error.response.headers);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('\n*******JIRA_UTILS: No server response:', error.request);
        }

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
                "id": "22595"
            },
            "summary": summary,
            "description": description,
            "issuetype": {
                "id": "3"
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
        console.error('\n*******JIRA_UTILS: No server response:',err.message);              
        throw err;
    }
}

module.exports = {
    getIssuesAssignedToCurrentUser,
    createJiraTask
}