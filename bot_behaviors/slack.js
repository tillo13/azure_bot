const { MessageFactory } = require('botbuilder');
const chatCompletion = require('./chat_helper');

//for slack conversation.replies endpoint
const https = require('https');

// check if the message is indeed from slack
function isFromSlack(context) {
  return context.activity.channelId === 'slack';
}

// Function for processing the assistant response message specific to Slack
function processSlackResponseMessage(assistantResponse) {
    return `slack_chat_path: ${assistantResponse}`;
}

//get user data from slack conversations api
async function logUserConversation(channel_id, thread_ts, apiToken) {
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
        let messages = JSON.parse(responsePayload).messages.filter(msg => msg.user !== 'bot');
        console.log('***EXTRAPOLATED CHRONOLOGICAL USER SUBMITS VIA CONVERSATIONS.REPLIES API FROM SLACK***');
        messages.forEach((msg, idx) => {
          console.log(`${idx + 1}. [${msg.ts}] ${msg.text}`);
        });
        console.log('***END OF EXTRAPOLATION***');
        resolve();
      });
    });

    req.on('error', error => {
      console.error(error);
      reject(error);
    });

    req.end();
  });
};

let activeThreads = {};
async function handleSlackMessage(context, assistantResponse) {
  // Put the function call right before the code block where you decide how to process the Slack message
  let thread_ts = "";
  
  if (context.activity.channelData && context.activity.channelData.SlackMessage && context.activity.channelData.SlackMessage.event) {
      thread_ts = context.activity.channelData.SlackMessage.event.thread_ts || context.activity.channelData.SlackMessage.event.ts;
  }

  // Let's add a check for the API token and channel_id before calling logUserConversation()
  if(context.activity.channelData && context.activity.channelData.ApiToken && context.activity.channelData.SlackMessage && context.activity.channelData.SlackMessage.event.channel) {
    let apiToken = context.activity.channelData.ApiToken;  
    let channel_id = context.activity.channelData.SlackMessage.event.channel;  
    await logUserConversation(channel_id, thread_ts, apiToken);
  }    
  
  // Check if the message is part of a thread
  let isThreadReply = thread_ts && (context.activity.channelData.SlackMessage.event.thread_ts === thread_ts);
  
  // If the message includes '@bot' or '@atbot', add the thread to the activeThreads 
  if (context.activity.text && (context.activity.text.includes('@bot') || context.activity.text.includes('@atbot'))) {
    activeThreads[thread_ts] = true;
  }
  
  // If the message doesn't invoke the bot, log and return immediately without further processing
  if (!activeThreads[thread_ts]) {
    console.log("\n\n***SLACK.JS: SLACK_PAYLOAD_WITHOUT_CALLING_BOT --IGNORING!\n\n", context.activity.text);
    return;
  }

  if (context.activity.text && activeThreads[thread_ts]) {

      if (context.activity.channelId === 'slack' && thread_ts != "") {
          // process the assistant response message for Slack
          let slackMessageResponse = processSlackResponseMessage(assistantResponse);
          const replyActivity = MessageFactory.text(slackMessageResponse);

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