const axios = require('axios');
const jira_server = process.env['2023sept8_JIRA_SERVER'];
const username = process.env['2023sept8_JIRA_USERNAME'];
const api_token = process.env['2023sept8_JIRA_TOKEN'];

let parentKey = 'ADD-615'; // You can change this value anytime you want

async function getIssueId(issueKey) {
    try {
        const issue = await makeJiraRequest(`/rest/api/3/issue/${issueKey}`);
        return issue.id;
    } catch (err) {
        console.error(err.message);
        throw err;
    }
}

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
    const parentId = await getIssueId(parentKey);
    
    const url = `/rest/api/3/issue/`;
    const taskDataKey = {
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
                "id": parentId    // use parentId here
            }
        }
    };
    
    const taskDataId = {
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
                "id": parentId    // and here
            }
        }
    };

    try {
        // Try to create a task using the project key and issue type name
        const responseKey = await makeJiraRequest(url, taskDataKey, 'POST');
        console.log('\n*******JIRA_UTILS: Task created successfully using project key and issue type name');
        return responseKey;
    } catch (err) {
        console.error('\n*******JIRA_UTILS: Error creating JIRA task using project key and issue type name:', err.message);
        try {
            // If the first attempt fails, try to create a task using the project id and issue type id
            const responseId = await makeJiraRequest(url, taskDataId, 'POST');
            console.log('\n*******JIRA_UTILS: Task created successfully using project id and issue type id');
            return responseId;
        } catch (err) {
            console.error('\n*******JIRA_UTILS: Error creating JIRA task using project id and issue type id:', err.message);
            throw err;
        }
    }
}

module.exports = {
    getIssuesAssignedToCurrentUser,
    createJiraTask
}