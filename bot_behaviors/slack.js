const { MessageFactory } = require('botbuilder');
const chatCompletion = require('./chat_helper');

// check if the message is indeed from slack
function isFromSlack(context) {
  return context.activity.channelId === 'slack';
}

// Function for processing the assistant response message specific to Slack
function processSlackResponseMessage(assistantResponse) {
    return `slack_chat_path: ${assistantResponse}`;
}

async function handleSlackMessage(context, assistantResponse) {
  if (context.activity.text && (context.activity.text.includes('@bot') || context.activity.text.includes('@atbot'))) {
      // Check if a thread_ts exists
      let thread_ts = "";
      if (context.activity.channelData && context.activity.channelData.SlackMessage && context.activity.channelData.SlackMessage.event) {
          thread_ts = context.activity.channelData.SlackMessage.event.thread_ts || context.activity.channelData.SlackMessage.event.ts;
      }

      if(thread_ts === "" && !context.activity.conversation.id.includes(thread_ts)) {
          // If thread_ts doesn't exist, it means it's the first message to bot.
          const welcomeMessage = "Welcome! Let's start a new thread for our conversation.";
          const welcomeActivity = MessageFactory.text(welcomeMessage);

          await context.sendActivity(welcomeActivity);

          // Now there should be thread_ts in context.activity 
          thread_ts = context.activity.channelData.SlackMessage.event.thread_ts || context.activity.channelData.SlackMessage.event.ts;
      }

      if (context.activity.channelId === 'slack') {
          // process the assistant response message for Slack
          let slackMessageResponse = processSlackResponseMessage(assistantResponse);
          const replyActivity = MessageFactory.text(slackMessageResponse);

          // Try to send as thread reply in Slack
          try {
              replyActivity.conversation = context.activity.conversation;
              
              // verify if thread_ts is already in the conversation id
              if (!replyActivity.conversation.id.includes(thread_ts)) {
                  replyActivity.conversation.id += ":" + thread_ts;
              }
          } catch (error) {
              console.error("An error occurred while trying to reply in thread", error);
          }

          await context.sendActivity(replyActivity);
      }
  } else {
      // Log a message
      console.log("\n\n***SLACK.JS: Message is not invoking the bot, ignore for now!***\n\n");
  }
};

module.exports = { handleSlackMessage, isFromSlack };