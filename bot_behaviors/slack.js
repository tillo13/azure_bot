const { MessageFactory } = require('botbuilder');
const chatCompletion = require('./chat_helper');
const https = require('https');

function isFromSlack(context) {
  return context.activity.channelId === 'slack';
}

function processSlackResponseMessage(assistantResponse) {
    return `slack_chat_path: ${assistantResponse}`;
}

async function logUserConversation(channel_id, thread_ts, apiToken, botId) {
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


        let messages = JSON.parse(responsePayload).messages.filter(msg => !msg.hasOwnProperty('bot_id'));


        console.log('***EXTRAPOLATED CHRONOLOGICAL USER SUBMITS VIA CONVERSATIONS.REPLIES API FROM SLACK***');
        messages.forEach((msg, idx) => {
          console.log(`${idx + 1}. [${msg.ts}] ${msg.text}\n`);
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
    // Extract Bot ID from context
    let botId = context.activity.channelData && context.activity.channelData.authorizations ? context.activity.channelData.authorizations[0].user_id : "";
    console.log('\n\n***SLACK.JS: EXTRACTED BOTID: ', botId);

    let thread_ts = "";
    if (context.activity.channelData && context.activity.channelData.SlackMessage && context.activity.channelData.SlackMessage.event) {
        thread_ts = context.activity.channelData.SlackMessage.event.thread_ts || context.activity.channelData.SlackMessage.event.ts;
    }

    if(context.activity.channelData && context.activity.channelData.ApiToken && context.activity.channelData.SlackMessage && context.activity.channelData.SlackMessage.event.channel) {
        let apiToken = context.activity.channelData.ApiToken;  
        let channel_id = context.activity.channelData.SlackMessage.event.channel;  
        await logUserConversation(channel_id, thread_ts, apiToken, botId);
    }

    let isThreadReply = thread_ts && (context.activity.channelData.SlackMessage.event.thread_ts === thread_ts);
    if (context.activity.text && (context.activity.text.includes('@bot') || context.activity.text.includes('@atbot'))) {
        activeThreads[thread_ts] = true;
    }

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