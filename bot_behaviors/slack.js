//2023sept16 1159am testing//

const { MessageFactory } = require('botbuilder');
const chatCompletion = require('./chat_helper');
const https = require('https');

function isFromSlack(context) {
  return context.activity.channelId === 'slack';
}

function processSlackResponseMessage(assistantResponse) {
    return `slack_chat_path: ${assistantResponse}`;
}

async function postMessageToSlack(channel_id, thread_ts, message, apiToken) {
  const data = JSON.stringify({
    channel: channel_id,
    thread_ts: thread_ts,
    text: message
  });

  console.log('\n\n***SLACK.JS: REQUEST Slack message payload:\n', data); // Log the payload being sent to Slack

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

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log("\n\n***SLACK.JS: RESPONSE message payload from Slack:\n", JSON.parse(data)); // Log the response from Slack
        resolve(data);
      });

    });

    req.on('error', (error) => {
      console.error("Failed to post message to Slack: ", error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

function getBotId(apiToken) {
  const options = {
    hostname: 'slack.com',
    path: '/api/auth.test',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Bearer ${apiToken}`
    }
  };

  let userId = '';

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      res.setEncoding('utf8');
      res.on('data', chunk => {
        userId += chunk;
      });

      res.on('end', () => {
        userId = JSON.parse(userId).user_id; 
        resolve(userId);
      });
    });

    req.on('error', (e) => {
      console.error(`problem with request: ${e.message}`);
      reject(e);
    });

    req.end();
  });
}

async function logUserConversation(channel_id, thread_ts, apiToken, botId, shouldPostToSlack) {
  const options = {
    hostname: 'slack.com',
    path: `/api/conversations.replies?channel=${channel_id}&ts=${thread_ts}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiToken}`
    }
  };

  let responsePayload = '';

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      res.on('data', d => {
        responsePayload += d;
      });

      res.on('end', async () => {
        let messages = JSON.parse(responsePayload).messages.filter(msg => !msg.hasOwnProperty('bot_id'));
        let messageLog = "\n***EXTRAPOLATED CHRONOLOGICAL USER SUBMITS VIA CONVERSATIONS.REPLIES API FROM SLACK***\n";
        messages.forEach((msg, idx) => {
          messageLog += `\n${idx + 1}. [${msg.ts}] ${msg.text}\n`;
        });
        messageLog += '\n***END OF EXTRAPOLATION***\n';
      
        if(shouldPostToSlack) {
          console.log("\n\n***SLACK.JS: Let me check path invoked, trying to post to slack!!\n\n");
          await postMessageToSlack(channel_id, thread_ts, messageLog, apiToken);
        }
      
        console.log('\n***SLACK.JS: Current Slack channel ID: ', channel_id); 
        console.log(messageLog);
        resolve(messageLog); // Return the messageLog here
      });
    });

    req.on('error', error => {
      console.error(error);
      reject(error);
    });

    req.end();
  });
}

let activeThreads = {};
async function handleSlackMessage(context, assistantResponse) {
  // Extract Bot Token from context
  let apiToken = context.activity.channelData && context.activity.channelData.ApiToken;

  // Get bot id
  let botId = await getBotId(apiToken);

  console.log('\n\n***SLACK.JS: EXTRACTED BOTID: ', botId);

  //get thread from slack
  let thread_ts = "";
  let channel_id;  

  if (context.activity.channelData && context.activity.channelData.SlackMessage && context.activity.channelData.SlackMessage.event) {
      thread_ts = context.activity.channelData.SlackMessage.event.thread_ts || context.activity.channelData.SlackMessage.event.ts;
      channel_id = context.activity.channelData.SlackMessage.event.channel;
  }

  let isThreadReply = thread_ts && (context.activity.channelData.SlackMessage.event.thread_ts === thread_ts);
  if (context.activity.text && (context.activity.text.includes('@bot') || context.activity.text.includes('@atbot'))) {
      activeThreads[thread_ts] = true;
  }

  if (!activeThreads[thread_ts]) {
      console.log("\n\n***SLACK.JS: SLACK_PAYLOAD_WITHOUT_CALLING_BOT --IGNORING!\n\n");
      return;
  }

  console.log(context.activity.text);
  if (context.activity.text && activeThreads[thread_ts]) {
      if (context.activity.channelId === 'slack' && thread_ts != "") {
          // process the assistant response message for Slack
          let slackMessageResponse = processSlackResponseMessage(assistantResponse);
          const replyActivity = MessageFactory.text(slackMessageResponse);

          console.log('***SLACK.JS: assistantResponse', assistantResponse);

          if(assistantResponse.includes('Let me check our past conversations, one moment...')) {
            console.log("***SLACK.JS: 'Let me check our past conversations, one moment...' string path found");
          }

          await logUserConversation(channel_id, thread_ts, apiToken, botId, assistantResponse.includes('Let me check our past conversations, one moment...'));

          // try to send as thread reply in Slack
          try {     
              replyActivity.conversation = context.activity.conversation;
              // verify if thread_ts is already in the conversation id
              if (!replyActivity.conversation.id.includes(thread_ts)) {
                  replyActivity.conversation.id += ":" + thread_ts;
              }
              await context.sendActivity(replyActivity);
          } catch (error) {
              console.error("An error occurred while trying to reply in thread: ", error);
          }
      } else if (thread_ts == "") {
          console.log("\n\n***SLACK.JS: Can't identify thread, not posting anything.***\n\n");
      } else {
          // log a message
          console.log("\n\n***SLACK.JS: Message is not invoking the bot, ignore for now!***\n\n");
      }
  }
};

module.exports = { handleSlackMessage, isFromSlack };