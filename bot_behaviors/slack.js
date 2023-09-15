const { MessageFactory } = require('botbuilder');
const chatCompletion = require('./chat_helper');

async function handleRequeryNotice(context) {
  const replyActivity = MessageFactory.text("Let me check our past conversations, one moment...");
  replyActivity.conversation = context.activity.conversation;
  
  try {
    replyActivity.conversation.id += ":" + context.activity.channelData.SlackMessage.event.ts;
  } catch (error) {
    console.error("An error occurred while trying to reply in thread", error);
  }

  await context.sendActivity(replyActivity);
};

async function handleSlackMessage(context) {
  const response = await chatCompletion(context.activity.text, "You are a helpful assistant. You will talk like a potato.");

 // Create the reply with the assistant response text from the response object
 const replyActivity = MessageFactory.text(`slack_chat_path: ${response.assistantResponse}`);

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

module.exports = {
  handleSlackMessage,
  handleRequeryNotice
};