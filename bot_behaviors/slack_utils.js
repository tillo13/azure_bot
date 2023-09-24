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

    return await executeHttpPostRequest(options, data);
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

module.exports = { fetchConversationHistory, getBotId, executeHttpGetRequest, executeHttpPostRequest, postMessageToSlack };
