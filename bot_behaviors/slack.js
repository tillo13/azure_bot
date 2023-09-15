const { MessageFactory } = require('botbuilder');
const chatCompletion = require('./chat_helper');

async function handleSlackMessage(context) {
   const response = await chatCompletion(context.activity.text, "You are a helpful assistant. You will talk like a horse.");

  // Create the reply
  const replyActivity = MessageFactory.text(`slack_chat_path: ${response}`);

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