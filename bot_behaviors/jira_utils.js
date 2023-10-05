const axios = require('axios');
const os = require('os');

// Get the JIRA config from the environment variable
const api_token = process.env['2023sept8_JIRA_TOKEN'];
const username = process.env['2023sept8_JIRA_USERNAME'];
const jira_server = process.env['2023sept8_JIRA_SERVER'];

/**
* Makes an HTTP request to the JIRA server and returns the response.
*/
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

/**
 Retrieves all issues assigned to the current user..
*/
async function getIssuesAssignedToCurrentUser() {
    try {
        console.log('\n*******JIRA_UTILS: Attempting to Fetch Jira Issues Assigned to Current User');
        const issues = await makeJiraRequest(`/rest/api/3/search?jql=assignee=currentuser()`);
        console.log('\n*******JIRA_UTILS: Successfully Fetched Jira Issues Assigned to Current User, Response:', JSON.stringify(issues, null, 2));
        return issues;
    } catch (error) {
        console.error('*******JIRA_UTILS: Error Fetching Jira Issues Assigned to Current User:', error.message);

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

module.exports = {
    getIssuesAssignedToCurrentUser,
}