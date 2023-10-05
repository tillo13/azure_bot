const axios = require('axios');
const jira_server = process.env['2023sept8_JIRA_SERVER'];
const username = process.env['2023sept8_JIRA_USERNAME'];
const api_token = process.env['2023sept8_JIRA_TOKEN'];
const parentKey = process.env['2023sept8_JIRA_PARENT_KEY'];
const projectId = process.env['2023sept8_JIRA_PROJECT_ID'];
const projectName = process.env['2023sept8_JIRA_PROJECT_NAME'];

//generic Jira data that can be public
let issueType = 'Task'; 
let issueTypeId = '3';

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
        let formatted_issues = issues.issues.map(issue =>
            `*${issue.key}* ${issue.fields.summary}\n<${jira_server}/browse/${issue.key}|Go to Issue>`
        ).join("\n-----------------\n");
        return formatted_issues;
    } catch (err) {
        console.error(err.message);
        throw `Error retrieving JIRA issues: ${err.message}`;
    }
}

async function createJiraTask(summary, description) {
    const parentId = await getIssueId(parentKey); 
    const url = '/rest/api/3/issue/';

    const taskData = {
        "fields": {
            "project": {
                "key": projectId // using the one from .env
            },
            "summary": summary,
            "description": description,
            "issuetype": {
                "name": issueType // using the one from .env
            },
            "parent": {
                "id": parentId   
            }
        }
    };
    
    try {
        const response = await makeJiraRequest(url, taskData, 'POST');
        console.log('\n*******JIRA_UTILS: Task created successfully using project key and issue type name');
        return `Task ${response.key} has been created under ${parentKey} with the description: ${description}`;
    } catch (err) {
        console.error('\n*******JIRA_UTILS: Error creating JIRA task using project key and issue type name:', err.message);
        return `Error creating JIRA task: ${err.message}`;
    }
}
module.exports = {
    getIssuesAssignedToCurrentUser,
    createJiraTask
}