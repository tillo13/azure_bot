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

async function logUserConversation(channel_id, thread_ts, apiToken, botId) {
  res.on('end', () => {
    let messages = JSON.parse(responsePayload).messages.filter(msg => !msg.hasOwnProperty('bot_id'));
    let chronologicUserConversation = messages.map(msg => `${msg.ts} ${msg.text}`).join("\n");
    resolve(chronologicUserConversation);
  });
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


        console.log('\n\n***EXTRAPOLATED CHRONOLOGICAL USER SUBMITS VIA CONVERSATIONS.REPLIES API FROM SLACK***\n');
        messages.forEach((msg, idx) => {
          console.log(`\n${idx + 1}. [${msg.ts}] ${msg.text}\n`);
        });
        console.log('\n***END OF EXTRAPOLATION***');
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
let botId = ''; // Defined at the top level in the script

async function handleSlackMessage(context, chatMessagesUser, chatResponse, PERSONALITY_OF_BOT) {
  if (context.activity.channelData) {
    // Extract Bot Token, thread timestamp (thread_ts) and channel id from context
    let apiToken = context.activity.channelData.ApiToken;
    let thread_ts = context.activity.channelData.SlackMessage.event.thread_ts ||
                    context.activity.channelData.SlackMessage.event.ts;
    let channel_id = context.activity.channelData.SlackMessage.event.channel;

    // Get botId using the bot token
    if (!botId) {
      botId = await getBotId(apiToken);
    }

    // Log user conversation
    let loggedUserConversation = await logUserConversation(channel_id, thread_ts, apiToken, botId);

    if (chatResponse.requery) {
      // In case of requery, adjust the conversation history and recall the chat helper function
      chatMessagesUser.push(
        {role: "assistant", content: "What are the data points you've shared with me so far as I cannot answer your question of " + context.activity.text + "?"},
        {role: "user", content: loggedUserConversation}
      );}
  
      chatResponse = await chatCompletion(chatMessagesUser, PERSONALITY_OF_BOT);
      let replyActivity = MessageFactory.text(`slack_chat_path: ${chatResponse.assistantResponse}`);
      
      replyActivity.conversation = context.activity.conversation;
      if (!replyActivity.conversation.id.includes(thread_ts)) {
          replyActivity.conversation.id += ":" + thread_ts;
      }   
      await context.sendActivity(replyActivity);
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