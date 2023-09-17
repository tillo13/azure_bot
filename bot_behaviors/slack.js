//2023sept16 442pm testing GOLDEN VERSION//

const { MessageFactory } = require('botbuilder');
const chatCompletion = require('./chat_helper');
const https = require('https');

function isFromSlack(context) {
  return context.activity.channelId === 'slack';
}

function processSlackResponseMessage(assistantResponse) {
    return `slack_chat_path: ${assistantResponse}`;
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

// Isolate the postMessageToSlack as a tasks method in broken_slack.js and 
// make it an independent function in the new_slack.js like this.

async function postMessageToSlack(channel_id, thread_ts, message, apiToken) {
  console.log("\n\n***SLACK.JS: Post message to Slack.");

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

async function postChatHistoryToSlack(channel_id, thread_ts, apiToken, botId) {
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

      res.on('end', () => {
        // Extract the messages from the response
        let messages = JSON.parse(responsePayload).messages.filter(msg => !msg.hasOwnProperty('bot_id'));

        // Format the messages
        let formattedMessages = "\n***EXTRAPOLATED CHRONOLOGICAL USER SUBMITS VIA CONVERSATIONS.REPLIES API FROM SLACK***";
        messages.forEach((msg, idx) => {
          formattedMessages += `\n${idx + 1}. [${msg.ts}] ${msg.text}`;
        });
        formattedMessages += "\n***END OF EXTRAPOLATION***";
        resolve(formattedMessages);

        // Call chat.postMessage API
        let postOptions = {
          hostname: 'slack.com',
          path: '/api/chat.postMessage',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': `Bearer ${apiToken}`
          }
        };

        let postReq = https.request(postOptions, res => {
          res.on('end', () => {
            console.log('\n****SLACK.JS: Successful postChatHistoryToSlack()');
            resolve();
          });
        });

        postReq.on('error', error => {
          console.error('\n****SLACK.JS: Error during postChatHistoryToSlack() post request:', error);
          reject(error);
        });

        postReq.write(JSON.stringify({
          channel: channel_id,
          text: formattedMessages,
          thread_ts: thread_ts,
        }));

        postReq.end();
      });
    });

    req.on('error', error => {
      console.error("\n****SLACK.JS: Error in postChatHistoryToSlack(): ", error);
      reject(error);
    });

    req.end();
  });
};

let activeThreads = {};
async function handleSlackMessage(context, assistantResponse) {
  
  console.log('\n\n***SLACK.JS: handleSlackMessage called with assistantResponse: ', assistantResponse);
  let apiToken = context.activity.channelData && context.activity.channelData.ApiToken;

  // Get Bot id
  let botId = await getBotId(apiToken);
  console.log('\n\n***SLACK.JS: EXTRACTED BOTID: ', botId);

  let thread_ts = "";
  if (context.activity.channelData && context.activity.channelData.SlackMessage && context.activity.channelData.SlackMessage.event) {
    thread_ts = context.activity.channelData.SlackMessage.event.thread_ts || context.activity.channelData.SlackMessage.event.ts;
  }

  let channel_id = context.activity.channelData?.SlackMessage?.event?.channel;
    
  let isThreadReply = thread_ts && (context.activity.channelData.SlackMessage.event.thread_ts === thread_ts);
  
  if (context.activity.text && (context.activity.text.includes('@bot') || context.activity.text.includes('@atbot'))) {
    activeThreads[thread_ts] = true;
  }
  
  if (!activeThreads[thread_ts]) {
    console.log("\n\n***SLACK.JS: SLACK_PAYLOAD_WITHOUT_CALLING_BOT --IGNORING!\n\n", context.activity.text);
    return; 
  }

  if (context.activity.text && activeThreads[thread_ts]) {

    if(context.activity.channelId === 'slack' && thread_ts != "") {

      // process the assistant response message for Slack
      let slackMessageResponse = processSlackResponseMessage(assistantResponse);
      const replyActivity = MessageFactory.text(slackMessageResponse);
      
      //  try to send as thread reply in Slack
      try {     
        replyActivity.conversation = context.activity.conversation;
        // verify if thread_ts is already in the conversation id
        if (!replyActivity.conversation.id.includes(thread_ts)) {
          replyActivity.conversation.id += ":" + thread_ts;
        }
        
        await context.sendActivity(replyActivity);
        
        var postExtrapolatedToSlack = false;
      
        // if assistantResponse is 'Let me check our past conversations, one moment...'
        if (assistantResponse.includes('Let me check our past conversations, one moment...')) {
          console.log("\n\n***SLACK.JS: Specific assistant message detected! Preparing to post chat history to Slack.");
          postExtrapolatedToSlack = true;

          // call postChatHistoryToSlack to get chat history
          let messageLog = await postChatHistoryToSlack(channel_id, thread_ts, apiToken, botId);
          console.log('\n****SLACK.JS: Chat history fetched from Slack.');
            
          // now post the history message to Slack
          console.log("\n\n***SLACK.JS: postChatHistoryToSlack will be called with the following parameters:\n");
          console.log(`Channel Id: ${channel_id}\nThread Timestamp: ${thread_ts}\nAPI Token: ${apiToken}\nBotId: ${botId}`);
          await postMessageToSlack(channel_id, thread_ts, messageLog, apiToken);
          console.log('\n\n***SLACK.JS: Successfully posted a message to Slack.');
        }

        console.log("\n\n***SLACK.JS: Value of postExtrapolatedToSlack: ", postExtrapolatedToSlack);
            
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