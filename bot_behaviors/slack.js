const { MessageFactory } = require('botbuilder');
const chatCompletion = require('./chat_helper');

async function handleSlackMessage(context, responseText) {
  
  // Create the reply with the assistant response text from the parameter
  const replyActivity = MessageFactory.text(`slack_chat_path: ${responseText}`);

  // Try to send as thread reply in Slack
  try {
    // Copy the conversation object from original message
    replyActivity.conversation = context.activity.conversation;
   
    // Append the ID of the parent message to post our message as reply.
    replyActivity.conversation.id += ":" + context.activity.channelData.SlackMessage.event.ts;
   
  } catch (error) {
    console.error("An error occurred while trying to reply in thread", error);
  }

  await context.sendActivity(replyActivity);
};

module.exports = handleSlackMessage;