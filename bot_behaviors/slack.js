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
  let isThreadReply = context.activity.channelData && context.activity.channelData.SlackMessage && context.activity.channelData.SlackMessage.event && context.activity.channelData.SlackMessage.event.thread_ts;

  if (context.activity.text && ((context.activity.text.includes('@bot') || context.activity.text.includes('@atbot')) || (isThreadReply && context.activity.channelData.SlackMessage.event.thread_ts === isThreadReply && (context.activity.text.includes('@bot') || context.activity.text.includes('@atbot'))))) {
      }

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