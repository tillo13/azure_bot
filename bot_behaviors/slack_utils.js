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

async function fetchConversationHistory(slack_channel_id, thread_ts, apiToken) {
  const options = {
    hostname: 'slack.com',
    path: `/api/conversations.replies?channel=${slack_channel_id}&ts=${thread_ts}`,
    headers: {
      'Authorization': `Bearer ${apiToken}`
    }
  };
 
  return await executeHttpGetRequest(options);
}

async function postMessageToSlack(slack_channel_id, thread_ts, message, apiToken) {
  const dataJSON = {
    channel: slack_channel_id
  };

  if (message.blocks) {
    dataJSON.blocks = message.blocks; // prefer first message is a block structure
  } else {
    dataJSON.text = message; // Treat as plain text
  }

  if (thread_ts) {
    dataJSON.thread_ts = thread_ts;
  }

  const data = JSON.stringify(dataJSON);

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
  console.log("\n*****SLACK_UTILS.JS: postMessageToSlack sending slack logging payload:\n", data);
  console.log("\n*****SLACK_UTILS.JS: postMessageToSlack using Options:\n", options);
  
  return executeHttpPostRequest(options, data)
      .then(response => {
          // log the response object
          console.log("\n*****SLACK_UTILS.JS: postMessageToSlack validation of posting received response:\n", response);
          return response;
      })
      .catch(error => {
          // log any error
          console.error("\n*****SLACK_UTILS.JS: Error in postMessageToSlack:\n", error);
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

async function addReaction(slack_channel_id, timestamp, reaction, apiToken) {
  const data = JSON.stringify({
      channel: slack_channel_id,
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

async function removeReaction(slack_channel_id, timestamp, reaction, apiToken) {
  const data = JSON.stringify({
      channel: slack_channel_id,
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