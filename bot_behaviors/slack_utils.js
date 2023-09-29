/** 2023sept23 5:37pm
 * This module contains utility functions interacting with Slack's API:
 * 
 * - executeHttpGetRequest: a generic function to issue GET requests to a given API endpoint.
 * - executeHttpPostRequest: a generic function to issue POST requests to a given API endpoint with a provided data payload.
 * - fetchConversationHistory: using Slack's conversations.replies API, fetches the conversation history for a provided channel ID and message thread timestamp.
 * - postMessageToSlack: posts a message to a given Slack channel and thread by interacting with Slack's chat.postMessage API.
 * - getBotId: using Slack's auth.test API, fetches the Bot user ID associated with the provided API token.
 * 
 * All functions are exported for use in other modules by listing them in module.exports at the end. 
 */

const https = require('https');

async function executeHttpGetRequest(options) {
  return new Promise((resolve, reject) => {
    https
      .get(options, res => {
        let responsePayload = '';
        res.on('data', (d) => (responsePayload += d));
        res.on('end', () => resolve(JSON.parse(responsePayload)));
        res.on('error', reject);
      })
      .end();
  });
}

async function executeHttpPostRequest(options, data = '') {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let returnData = '';
      res.on('data', chunk => returnData += chunk);
      res.on('end', () => resolve(JSON.parse(returnData)));
      res.on('error', reject);
    });
    req.write(data);
    req.end();
  });
}

async function fetchConversationHistory(channelId, thread_ts, apiToken) {
  const options = {
    hostname: 'slack.com',
    path: `/api/conversations.replies?channel=${channelId}&ts=${thread_ts}`,
    headers: {
      'Authorization': `Bearer ${apiToken}`
    }
  };
 
  return await executeHttpGetRequest(options);
}

async function postMessageToSlack(channel_id, thread_ts, message, apiToken) {
  const data = JSON.stringify({
      channel: channel_id,
      thread_ts: thread_ts,
      text: message
  });

  const options = {
      hostname: 'slack.com',
      path: '/api/chat.postMessage',
      method: 'POST',
      headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Bearer ${apiToken}`,
          'Content-Length': data.length
      }
  };

  // log the data and options objects
  console.log("*****SLACK_UTILS.JS: postMessageToSlack sending Data:", data);
  console.log("*****SLACK_UTILS.JS: postMessageToSlack using Options:", options);
  
  return executeHttpPostRequest(options, data)
      .then(response => {
          // log the response object
          console.log("*****SLACK_UTILS.JS: postMessageToSlack received Response:", response);
          return response;
      })
      .catch(error => {
          // log any error
          console.error("*****SLACK_UTILS.JS: Error in postMessageToSlack:", error);
          throw error;   // propagate the error to higher-level try-catch blocks
      });
}

async function getBotId(apiToken) {
  const options = {
    hostname: 'slack.com',
    path: '/api/auth.test',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Bearer ${apiToken}`
    }
  };
  const response = await executeHttpGetRequest(options);
  return response.user_id;
}

async function addReaction(channel, timestamp, reaction, apiToken) {
  const data = JSON.stringify({
      channel: channel,
      timestamp: timestamp,
      name: reaction
  });

  const options = {
      hostname: 'slack.com',
      path: '/api/reactions.add',
      method: 'POST',
      headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Bearer ${apiToken}`,
          'Content-Length': data.length
      }
  };

  return await executeHttpPostRequest(options, data);
}

async function removeReaction(channel, timestamp, reaction, apiToken) {
  const data = JSON.stringify({
      channel: channel,
      timestamp: timestamp,
      name: reaction
  });

  const options = {
      hostname: 'slack.com',
      path: '/api/reactions.remove',
      method: 'POST',
      headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Bearer ${apiToken}`,
          'Content-Length': data.length
      }
  };

  return await executeHttpPostRequest(options, data);
}

module.exports = { fetchConversationHistory, getBotId, executeHttpGetRequest, executeHttpPostRequest, postMessageToSlack, addReaction, removeReaction };