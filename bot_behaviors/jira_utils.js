const axios = require('axios');
const jira_server = process.env['2023sept8_JIRA_SERVER'];
const username = process.env['2023sept8_JIRA_USERNAME'];
const api_token = process.env['2023sept8_JIRA_TOKEN'];
const parentKey = process.env['2023sept8_JIRA_PARENT_KEY'];
const projectName = process.env['2023sept8_JIRA_PROJECT_NAME'];
const defaultAccountId = process.env['2023oct6_JIRA_DEFAULT_USER_ACCOUNT_ID'];
const defaultLabelTitle = process.env['2023oct6_JIRA_DEFAULT_LABEL_TITLE'];


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

async function createJiraTask(summary, description, channelId) {
    try {
        const taskData = {
            "fields": {
                "project": {
                    "key": projectName
                },
                "summary": summary,
                "description": {
                    "type": "doc",
                    "version": 1,
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [
                                {
                                    "type": "text",
                                    "text": description
                                }
                            ]
                        }
                    ]
                },
                "issuetype": {
                    "name": issueType
                },
                "parent": {
                    "id": await getIssueId(parentKey)
                },
                "assignee": {
                    "accountId": defaultAccountId
                },
                "labels": [
                    defaultLabelTitle
                ]
            }
        };

        const createUrl = '/rest/api/3/issue/';
        const createResponse = await makeJiraRequest(createUrl, taskData, 'POST');
        console.log('\n*******JIRA_UTILS: Task created successfully');
        
        const newIssueId = createResponse.id;
        const commentUrl = `/rest/api/3/issue/${newIssueId}/comment`;
        const commentData = {
            "body": `Created by @bot automatically via ${channelId}`
        };
        console.log('\n*******JIRA_UTILS: Comment Payload:', JSON.stringify(commentData, null, 2)); 

        const commentResponse = await makeJiraRequest(commentUrl, commentData, 'POST');
        console.log('\n*******JIRA_UTILS: Comment added to the task successfully');
        
        const taskUrl = `${jira_server}/browse/${createResponse.key}`;
        return `Task ${createResponse.key} has been created under ${parentKey} with the description: ${description}. You can view the task [here](${taskUrl}).`;
        
    } catch (err) {
        console.error('\n*******JIRA_UTILS: Error creating JIRA task or adding comment:', err.message);
        
        // If the above fails, try creating the task with original taskData
        return createTaskWithFallback(summary, description, channelId);
    }
};

async function createTaskWithFallback(summary, description, channelId) {
    try {
        // This is the reduced task data, without comment part
        const taskData = {
            "fields": {
                "project": {
                    "key": projectName
                },
                "summary": summary,
                "description": {
                    "type": "doc",
                    "version": 1,
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [
                                {
                                    "type": "text",
                                    "text": description
                                }
                            ]
                        }
                    ]
                },
                "issuetype": {
                    "name": issueType
                },
                "parent": {
                    "id": await getIssueId(parentKey)
                },
                "assignee": {
                    "accountId": defaultAccountId
                },
                "labels": [
                    defaultLabelTitle
                ]
            }
        };

        const url = '/rest/api/3/issue/';
        const response = await makeJiraRequest(url, taskData, 'POST');
        console.log('\n*******JIRA_UTILS: Task created successfully with fallback options');
        const taskUrl = `${jira_server}/browse/${response.key}`;
        return `Task ${response.key} has been created under ${parentKey} with the description: ${description}. You can view the task [here](${taskUrl}).`;
    } catch (err) {
        console.error('\n*******JIRA_UTILS: Error creating JIRA task with fallback options:', err.message);
        throw err;
    }
};
module.exports = {
    getIssuesAssignedToCurrentUser,
    createJiraTask
}