const { MessageFactory } = require('botbuilder');
const chatCompletion = require('./chat_helper');

const { MessageFactory } = require('botbuilder');
const chatCompletion = require('./chat_helper');

async function handleSlackMessage(context) {
  const response = await chatCompletion(context.activity.text, "You are a helpful assistant. You will talk like a potato.");

  const replyActivity = MessageFactory.text(`slack_chat_path: ${response.assistantResponse}`);
  replyActivity.conversation = { id: context.activity.conversation.id + ':' + context.activity.channelData.ts };

  await context.sendActivity(replyActivity);
};

module.exports = handleSlackMessage;