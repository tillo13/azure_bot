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

module.exports = { fetchConversationHistory };